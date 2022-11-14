//irc-connection
import 'dotenv/config';
import irc from 'irc-upd';
import config from './server.js';

const channel = process.env.CHANNEL;

const client = new irc.Client(config.server, config.name, {
    channels:config.channels,
    port:config.port,
    secure:config.secure,
    debug:false,
});
client.addListener('error', function(message) {
    console.log('error: ', message);
});


export default client;