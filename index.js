import 'dotenv/config';
import fs from 'fs';

const farmBotPath ='/home/meleeman/WebWork/farmBot/farmManager.mjs';
import client from './config/irc-connection.js';



const moduleExists = function(path) {
    if(fs.existsSync(path)) {
        return true;
    } else {
        console.log('>>> Error: module'+path+' doesn\'t exist!');
        return false;
    }
};

async function importFresh(modulePath) {
    const cacheBustingModulePath = `${modulePath}?update=${Date.now()}`;
    return (await import(cacheBustingModulePath)).default;
}


//use pms to send commands to reload chihobot
client.addListener('pm', async function (from, message) {
    console.log(from + ' => ME: ' + message);
    if (from == 'meleeman' && message == ':load farmBot') {
        let a = await importFresh(farmBotPath);
        await a.init();
    }
    if (from == 'meleeman' && message == ':reload farmBot') {
        let a = await importFresh(farmBotPath);
        await a.unload();
        await a.init();
    }
    if (from == 'meleeman' && message == ':unload farmBot') {
        let a = await importFresh(farmBotPath);

        await a.unload();
    }
});