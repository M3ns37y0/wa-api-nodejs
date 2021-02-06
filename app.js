const { Client } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const soketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneFormat } = require('./helpers/formatter');

const app = express();
const server = http.createServer(app);
const io = soketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const SESSION_FILE_PATH = './wa-api-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', {root:__dirname});
});
const client = new Client({ 
    puppeteer: { 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ],
        headless: true 
    }, 
    session: sessionCfg 
});

client.on('message', msg => {
    if (msg.body == 'Ok' || msg.body == 'ok') {
        msg.reply('Sip!');
    }else{
        msg.reply('Halo, saya Robot, Si Bos sedang maintenance sistem, jika sudah selesai Si Bos akan menghubungi anda kembali, tks ya !');
    }
    
});

client.initialize();

//soket io
io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        // console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'Silahkan scan QR Code!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'WhatsApp sudah siap!');
        socket.emit('message', 'WhatsApp sudah siap!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'WhatsApp sudah authenticated!');
        socket.emit('message', 'WhatsApp sudah authenticated!');
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });    

    client.on('disconnected', (reason) => {
        socket.emit('message', 'Whatsapp telah disconnected!');
        fs.unlinkSync(SESSION_FILE_PATH, function(err) {
            if(err) return console.log(err);
            // console.log('Session file deleted!');
        });
        client.destroy();
        client.initialize();

        soket.emit('remove-session', id);
    });

});

// cek nomor sudah terdaftar di wa atau belum
const cekNoValidedWA = async function(number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}
// kirim pesan
app.post('/kirim-pesan', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req).formatWith(({ msg }) => {
        return msg;
    });

    if (!errors.isEmpty()){
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        })
    }

    const number = phoneFormat(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await cekNoValidedWA(number);
    if (!isRegisteredNumber){
        return res.status(422).json({
            status: false,
            message: 'No ini tidak terdaftar di WA!'
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        });
    });
});

server.listen(8000, function(){
    console.log("App berjalan di port 8000");
});