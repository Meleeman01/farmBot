//farm manager
import 'dotenv/config';
import fetch from 'node-fetch';
import client from './config/irc-connection.js';
import c from 'irc-colors';
import DDG from 'duck-duck-scrape';
import fs from 'fs';

const channel = process.env.CHANNEL;


async function importFresh(modulePath) {
    const cacheBustingModulePath = `${modulePath}?update=${Date.now()}`;
    return (await import(cacheBustingModulePath)).default;
}

//pick a location to monitor for weather updates for freezing or precipitation.

//pick target planting month

//accuweather allows 5 days into future

const farmManager = {
    //modules and required libraries
    fetch: fetch,
    client: client,
    //config: await importFresh('./config/server'),
    //listen for commands
    weatherIcons:{
        'clear-day':'🌞',
        'partly-cloudy-day':'🌤',
        'cloudy':'🌥',
        'fog':'🌫',
        'rain':'🌧',
        'snow':'🌨',
        'wind':'🌬',
    },
    getLocations: async function() {

        if (fs.existsSync(process.env.DIRNAME+'locations.json')) {
            console.log('locations.json exists');
            return JSON.parse(await fs.readFileSync('locations.json','utf-8'));
        }
        else {
            console.log('locations.json doesnt exist!');
        }
    },
    listen: async function() {
        let locations = await farmManager.getLocations();
        //await farmManager.client.join(farmManager.client.channels,'hi');
        console.log(farmManager.client.chans);
        await farmManager.client.addListener('message', async function message(from, to, message) {
            console.log(from + ' => ' + to + ': ' + message);
            message = message.toLowerCase();
            if (message == '@help') {
                farmManager.client.say(from,
                    `${c.bold('<🌱Help Menu🌱>')}\n ${c.bold('USAGE:')}\n ${c.bold('@monitor')} ${c.bold.cyan('LOCATION')} ======= "picks a location to check for a forecast"\n ${c.bold('@clear')} ======= "clears all monitored locations."\n ${c.bold('@forecast')} ======= "gives forecast for all monitored locations to a user"
                    `
                );
                
            }
            if (message == '@clear') {
                locations[from] = [];
                try {
                    fs.writeFileSync('./locations.json', JSON.stringify(locations));
                    //file written successfully
                } catch (err) {
                    console.error(err);
                }
                farmManager.client.say(to,'all monitored locations cleared :3');
            }
            if (message.startsWith('@monitor')) {

                if (message.length > 8) {
                    let command = await message.replace('@monitor','').trim();
                    console.log(command);
                    if (locations[from] ==  undefined) {
                        locations[from] = [];
                        farmManager.client.say(channel,'sorry looks like you dont exist LOL');
                        locations[from].push(command);
                        console.log(locations[from]);
                    }
                    else {
                        locations[from].push(command);
                    }
                    
                    try {
                        fs.writeFileSync('./locations.json', JSON.stringify(locations));
                    //file written successfully
                    } catch (err) {
                        console.error(err);
                    }
                    console.log(locations[from].toString());

                    farmManager.client.say(to,`Okay. now monitoring these locations:[${locations[from].toString()}]`);
                }
                else {
                    farmManager.client.say(to,'monitor where?');
                }
                
            }
            if (message == '@forecast') {
                //monitor command should contain username and location.
                //pull from json file to determine place to monitor
                
                Object.entries(locations).forEach((entry)=>{
                    let key = entry[0];
                    let value = entry[1];
                    console.log(key,value);
                    if (key == from) {
                        console.log(key,value);
                        if (value.length == 0) {
                            farmManager.client.say(channel,`lol you don't have any locations to monitor, add some by saying farmbot monitor city st`);
                        }
                        for (const v of value) {
                            //iterate through the saved json data
                            try {
                                farmManager.getForecast(v,key);
                            }
                            catch(err){
                                continue;
                            }
                            
                        }
                    }

                });
                if (locations[from] == undefined) {
                    farmManager.client.say(to,`Sorry, ${from} wasn't found in the list, try saying "@monitor city st"`);
                }
            }



        });
    },
    init: async function() {
        console.log('init called.');
        await farmManager.client.say(channel,'FarmBot here, ready to monitor weather conditions for your selected area.');
        farmManager.listen();
    },
    load: async function () {
        console.log('load called.');
        await farmManager.init();
    },
    unload: async function() {
        console.log('unload called.');
        console.log(farmManager.client._events);
        await farmManager.client.say(channel,'FarmBot down for maintenance.');
        await farmManager.client.removeListener('message',farmManager.client._events.message);
    },
    getDetailedForcast: async function(location,user) {

    },
    getForecast: async function(location = 'cheney ks', user) {
        farmManager.client.say(user,'let me check the forecast...');
        try {
            console.log(user);
            let message = user+'\n'+location+':\n';
            let data = await DDG.forecast(location);
            await console.log(data.daily.data);
            let badWeather = data.daily.data.map((day)=>{
                let date = farmManager.convertUnixToDate(day.time);
                if (day.temperatureMin < 34) {
                    return {
                        'day': date,
                        'freeze':day, 
                        'temperature' :`${day.temperatureMin} - ${day.temperatureMax}`,
                    };
                }
                if (day.temperatureMax > 95) {
                    return {
                        'day':date,
                        'hot':day, 
                        'temperature' :`${day.temperatureMin} - ${day.temperatureMax}`
                    };
                }
                return {
                    'ideal':'ideal temperature day',
                    'day':date,
                    'data' : day,
                    'temperature': `${day.temperatureMin} - ${day.temperatureMax}`,
                };
            });
            console.log(badWeather);

            //this should just warn when the next freeze is and when the next hot or mild day is.
            for (let day in badWeather) {

                if (day == 0) {
                    console.log('lol this is today');
                    if (badWeather[day].freeze) {
                        message+=`❌ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].freeze.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].freeze.summary)} \n`;
                    }
                    else if (badWeather[day].hot) {
                        console.log('Today is hot for hydroponics, mind your water temps.');
                        message+=`Today is hot for hydroponics, mind your water temps. ${farmManager.weatherIcons[badWeather[day].hot.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].hot.summary)}  \n`;
                    }
                    else {
                        console.log('Today is perfect to place your plants outside');
                        message+=`✅ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].data.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].data.summary)}  \n`;
                    }
                    //if the next day is a 
                }
                else if (day == 1) {
                    if (badWeather[day].freeze) {
                        console.log('freeze tormorrow');
                        message+= `❌ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].freeze.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].freeze.summary)} \n`;
                    }
                    else if (badWeather[day].hot) {
                        console.log('Tomorrow will be hot for hydroponics, mind your water temps.');
                        message+=`Today is hot for hydroponics, mind your water temps. ${farmManager.weatherIcons[badWeather[day].hot.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].hot.summary)}  \n`;
                    }
                    else {
                        console.log('Tomorrow will be perfect to place your plants outside');
                        message+=`✅ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].data.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].data.summary)}  \n`;
                    }
                }
                else {
                    if (badWeather[day].freeze) {
                        message+=`❌ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].freeze.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].freeze.summary)}  \n`;
                        console.log('The day after freezing. \n');

                    }
                    else if (badWeather[day].hot) {
                        console.log('The day after will be hot for hydroponics, mind your water temps.');
                        message+=`The day after will be hot for hydroponics. ${c.lime(badWeather[day].temperature)} F ${c.brown(badWeather[day].hot.summary)}  \n`;
                    }
                    else {
                        message+=`✅ ${c.bold(badWeather[day].day)} ${farmManager.weatherIcons[badWeather[day].data.icon]} ${c.lime(badWeather[day].temperature)} F ${c.cyan(badWeather[day].data.summary)}  \n`;
                        console.log('The day after will be perfect to place your plants outside');
                    }
                }

            }
            farmManager.client.say(user,message);
        }
        catch(err) {
            console.log(err);

            farmManager.getForecast(location,user);
            farmManager.client.say(user,'one-sec...');
        }
    },
    convertUnixToDate: function(unixTimeStamp) {
        let d = new Date(unixTimeStamp*1000),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),  // Months are zero based. Add leading 0.
            dd = ('0' + d.getDate()).slice(-2),         // Add leading 0.
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),     // Add leading 0.
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh == 0) {
            h = 12;
        }

        // ie: 2014-03-24, 3:00 PM
        time =  mm + '-' + dd;
        return time;
    }
};

export default farmManager;