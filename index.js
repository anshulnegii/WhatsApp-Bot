const google = require('google-it') 
const https = require('https');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();
const MessageMedia = require('whatsapp-web.js/src/structures/MessageMedia');
const { Client } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');
var html2json = require('html2json').html2json;


const client = new Client({
  puppeteer: {
    args: ["--no-sandbox"],
  },
});
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
const cid=process.env.CLIENT_ID;
const sid=process.env.SECRET_ID;

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});
  
client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();

client.on('message', message => {
    if(message.body === '/ping') {
	    console.log(message.body)
        message.reply('pong');
    }
});

// commands
client.on('message', async message => {
    let chat = await message.getChat();
    if (chat.isGroup) {
        //kick***
        if (message.body.toLowerCase().startsWith("/kick ")) {
            if (checkAdmin(chat.participants, message.author)) {
                const numbers = message.body.slice(6);
                var numArr =  numbers.split(' ');
                for (let i = 0; i < numArr.length; i++) {
                    var num = numArr[i];
                    num = `${num.slice(1)}@c.us`
                    const remArr = [];
                    remArr.push(num);
                    try {
                        chat.removeParticipants(remArr);
                    } catch (error) {
                        message.reply('Invalid User')
                    }
                }
            } else {
                message.reply('*INVALID: USER & BOT SHOULD BE AN ADMIN*')
            }
        }
        // tagall***
        else if(message.body.toLowerCase().startsWith('/tagall-h')) {
            if (checkAdmin(chat.participants, message.author)) {
                let tagMsg = message.body.slice(10)
                let mentions = [];
                for(let participant of chat.participants) {
                    const contact = await client.getContactById(participant.id._serialized);       
                    mentions.push(contact);
                }
                await chat.sendMessage(tagMsg, { mentions });
            } else {
                message.reply('*INVALID: USER & BOT SHOULD BE AN ADMIN*')
            }
        }
        //tagall-h***
        else if(message.body.toLowerCase().startsWith('/tagall')) {
            if (checkAdmin(chat.participants, message.author)) {
                let tagMsg = (message.body.slice(8) === "") ? message.body.slice(8) : message.body.slice(8) + "\n\n"
                let mentions = [];
                for(let participant of chat.participants) {
                    const contact = await client.getContactById(participant.id._serialized);
                    mentions.push(contact);
                    tagMsg += `✅ @${participant.id.user} \n`;
                }
                await chat.sendMessage(tagMsg, { mentions });
            } else {
                message.reply('*INVALID: USER & BOT SHOULD BE AN ADMIN*')
            }
        }
        // add participants***
        else if(message.body.toLowerCase().startsWith('/add ')){
            const num = message.body.slice(5).replaceAll(/[ +()-]/g, "") + "@c.us"
            var addArr = []
            addArr.push(num)
            try {
                await chat.addParticipants(addArr);
            } catch (e) {
                message.reply('*Inavlid Number! Please try again*')
            }
        }
        // av @***
        else if (message.body.toLowerCase().includes('/av ')) {
            let user = message.body.slice(5) + "@c.us"
            const contact = await client.getContactById(user);
            try {
                var av = await contact.getProfilePicUrl();
                let media = await MessageMedia.fromUrl(av)
                message.reply(media)
            } catch (e) {
                message.reply('User Profile Picture not available')
            }
        }
        // av***
        else if (message.body.toLowerCase() === '/av') {
            const contact = await client.getContactById(message.author);
            try {
                var av = await contact.getProfilePicUrl();
                let media = await MessageMedia.fromUrl(av)
                message.reply(media)
            } catch (e) {
                message.reply('User Profile Picture not available')
            }
        }
    }
    // join group***
    if (message.body.toLowerCase().startsWith("/join ")) {
        try {
            const inviteLink = message.body.split('https://chat.whatsapp.com/')[1];
            const inviteCode = message.body.split(' ')[1];
        
            if (message.body.includes('https://chat.whatsapp.com/')){ 
                try {
                    await client.acceptInvite(inviteLink);
                } catch (e) {
                    message.reply('link revoked or the bot is removed from the group');
                }
            } else {
              await client.acceptInvite(inviteCode);
            }
        } catch (e) {
            message.reply('Invalid Group!')
        }
    }


    // google***
    else if (message.body.toLowerCase().startsWith('/google ')){
        const googleSearch = message.body.slice(8)
        if (googleSearch == undefined || googleSearch == ' ') 
           return message.reply(`*Result : ${googleSearch}* not found`)
        google({ 'query': googleSearch })
           .then(results => {
           let vars = `_*Result : ${googleSearch}*_\n`
           for (let i = 0; i < results.length; i++) {
               vars +=  `\n------------------------------------------------\n\n*Title* : 
               ${results[i].title}\n\n*Description* : 
               ${results[i].snippet}\n\n*Link* : 
               ${results[i].link}\n\n`
           }
        message.reply(vars);
        }).catch(e => {
            message.reply('Google Error : ' + e);
        })
    }
    //reddit***
    else if(message.body.toLowerCase().startsWith('/r ')){
        const subreddit = message.body.slice(3);
        fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${btoa(`${cid}:${sid}`)}`
            },
            body: 'grant_type=client_credentials'
          })
          .then(response => response.json())
          .then(data => {
            const accessToken = data.access_token;
            fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=100&include_over_18=false`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            })
            .then(response => response.json())
            .then(async data => {
              const posts = data.data.children;
              const images = [];
          
              posts.filter(post => post.data.post_hint === 'image' && !post.data.over_18)
                   .forEach(post => {
                     images.push(post.data.url);
                   });
          
              const randomIndex = Math.floor(Math.random() * images.length);
              const randomImage = images[randomIndex];
          
              var media = await MessageMedia.fromUrl(randomImage)
              chat.sendMessage(media, {caption: `From r/${subreddit}`})
            })
            .catch(error => message.reply('Invalid Subreddit'));
          })
          .catch(error => message.reply(`Unknown Error`));
    }
    // sticker***
    else if(message.body.toLowerCase().startsWith('/sticker')) {
        const text = message.body;
        const parts = text.split(",,");
        let desc = "";
        let author = "";
        
        if (parts.length > 1) {
          desc = parts[0].slice(9);
          author = parts[1].trim();
        } else {
          desc = text.slice(9);
        }
        
        if (author === "") {
          author = "AURA";
        }
                
        if (message.hasMedia) {
            const media = await message.downloadMedia()
            chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: desc, stickerAuthor: author});
        } 
        else if (message.hasQuotedMsg) {
            const qmsg = await message.getQuotedMessage()
            const media = qmsg.hasMedia ? await qmsg.downloadMedia() : qmsg.reply('*IMAGE NOT FOUND*')
            try {
                chat.sendMessage(media, { sendMediaAsSticker: true, stickerName: desc, stickerAuthor: author});
            } catch (e) {
                
            }
        } else {
            message.reply('*SEND IMAGE WITH A CAPTION*')
        }
    }

    // astronomy picture of the day**
    else if(message.body.toLowerCase().startsWith('/apod')){
		request("https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY", async function(error, response, body){
			let chat = await message.getChat();
			let r = JSON.parse(body);
			var media = await MessageMedia.fromUrl(r['hdurl']);
			await chat.sendMessage(media, {caption: `Title: ${r['title']}\nDescription: ${r['explanation']}\nDate: ${r['date']}`});
		});
	}

	// youtube**
	else if(message.body.toLowerCase().startsWith('/youtube ')){
		const question = message.body.slice(9);
		const  engine_id = "KEY";
		const api_key = "KEY";
		const page = 1;
		const start = (page - 1) * 10 + 1;

		request('https://www.googleapis.com/customsearch/v1?key=' + api_key + '&cx=' + engine_id + '&q=' + question + '&start=' + start, function(error, response, body){
			let links_json = JSON.parse(body);
			let items = links_json['items'];
			let firstSearch = items[0];
			url = firstSearch['link'];
			message.reply(url)
	        });
	    }

	// spotify song searcher**
	else if(message.body.toLowerCase().startsWith('/spotify ')){
		const query = message.body.slice(9)
		const options = {
		    method: 'GET',
		    url: 'https://spotify23.p.rapidapi.com/search/',
		    qs: {
		      q: query,
		      type: 'multi',
		      offset: '0',
		      limit: '10',
		      numberOfTopResults: '5'
		    },
		    headers: {
		      'X-RapidAPI-Key': "KEY",
		      'X-RapidAPI-Host': 'spotify23.p.rapidapi.com',
		      useQueryString: true
		    }
		  };
		  
		  request(options, function (error, response, body) {
		      let js = JSON.parse(body);
		      let tracks = js["tracks"]
		      let items = tracks["items"]
		      let data = items[0]
		      let data2 = data["data"]
		      let raw_uri = data2["uri"]
		  
		      let raw_uri2 = raw_uri.split(":")
		      let uri = raw_uri2[2]
		      message.reply(`https://open.spotify.com/track/${uri}`)
		  
		  });
	    }


	// lyrics**
	else if(message.body.toLowerCase().startsWith('/lyrics ') || message.body.toLowerCase().startsWith('/ly ')){
        let list = message.body.split(" ")
        let list2 = list.slice(1)
        let question = list2.join(" ")
        let lyricsList = '';
        async function lyrics() {
            const  engine_id = "KEY";
            const api_key = "KEY";
            const f_page = 1;
            const start = (f_page - 1) * 10 + 1;
            
            request('https://www.googleapis.com/customsearch/v1?key=' + api_key + '&cx=' + engine_id + '&q=' + question + '&start=' + start, async function(error, response, body){
                let f_links_json = JSON.parse(body);
                let f_items = f_links_json['items'];
                let f_firstSearch = f_items[0];
                let url = f_firstSearch['link'];

				const browser = await puppeteer.launch({headless: true});
                const page = await browser.newPage();
                await page.goto(url, {waitUntil:'domcontentloaded'});
				
                let checks = await page.$$('div[class*="Lyrics__Container-sc-"]')
                for(check of checks){
                    let text = await (await check.getProperty('innerText')).jsonValue();
                    console.log(text)
                    lyricsList += text
                }
                message.reply(lyricsList)
                await browser.close();
            })
            
        }
        lyrics();

    }
	// doubtnut**
	else if (message.body.toLowerCase().startsWith('/doubtnut ')){
		const question = message.body.slice(10);
		const  engine_id = "KEY";
		const api_key = "KEY";
		const page = 1;
		const start = (page - 1) * 10 + 1;
		
		request('https://www.googleapis.com/customsearch/v1?key=' + api_key + '&cx=' + engine_id + '&q=' + question + '&start=' + start, function(error, response, body){
		    let f_links_json = JSON.parse(body);
		    let f_items = f_links_json['items'];
		    let f_firstSearch = f_items[0];
		    url = f_firstSearch['link'];
		
		const fetchData = async () => {
			let res = await axios.get(url);
			let $ = await cheerio.load(res.data);
			let txt = $("#__NEXT_DATA__").text();
			let json = JSON.parse(txt);
			let props = json['props'];
			let pageProps = props['pageProps'];
			let videoData = pageProps['videoData'];
			let title = videoData['title'];
			let rawVideoLink = videoData['video_name'];
			let videoLink = "https://videos.doubtnut.com/" + rawVideoLink;
			let rawDuration = videoData['duration'];
			let duration = rawDuration / 60;
			message.reply(`Title:  ${title}\n${videoLink}\nDuration: ${Math.round(duration)}mins`);
		}
		fetchData();

	    })
	    }

		// reddit**
	    else if(message.body.toLowerCase().startsWith('/reddit ') || message.body.toLowerCase().startsWith('/rd')){
	        let messageToSend = ""
	        let list = message.body.split(" ")
	        let list2 = list.slice(1)
	        let subr = list2.join(" ")
	        request("https://redditapi.s9001.repl.co/reddit/" + subr, async function (error, response, body) {
	            try{
	                let data = body.split(" ");
	                if(data[0] == 'meta'){
	                    messageToSend = `URL: ${data[1]}\nTitle: ${data[2].replaceAll('_', ' ')}\nScore: ${data[3]}`;
	                    try{
	                        let chat = await message.getChat();
	                        var media = await MessageMedia.fromUrl(data[4]);
	                        await chat.sendMessage(media, {caption: `URL: ${data[1]}\nTitle: ${data[2].replaceAll('_', ' ')}\nScore: ${data[3]}`});   
	                    }
	                    catch(e){
	                        message.reply(messageToSend);   
	                    }
	                }
	                else{
	                    message.reply(body);
	                }
	            }  
	            catch(err){
	                message.reply("Reddit go brrrr...")
	            }
	        });
    	}
			
    // wolfram***
    else if (message.body.toLowerCase().startsWith("/wf ")) {
        const query = message.body.slice(3).replaceAll(" ", "+")
        const wolframapikey = process.env.WOLFRAM_API_KEY
        const url = "https://api.wolframalpha.com/v1/result?appid="+ wolframapikey +"&i="+ query +"%3f"
        try{
            https.get(url, (response) => {
                response.on("data", (data) => {
                    message.reply(data.toString('utf8'))
                })
            })
        }
        catch (e){
            let media = MessageMedia.fromUrl('https://i.imgur.com/9fZoAIC.jpeg')
            message.reply(media)
        }
    }
    else if (message.body.toLowerCase().startsWith("/g ")) {
        const query = message.body.slice(2)
        const apikey = process.env.API_KEY;
        const orgkey = process.env.ORG_KEY;
        const configuration = new Configuration({
            organization: orgkey,
            apiKey: apikey,
        });
        const openai = new OpenAIApi(configuration);
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: query,
            max_tokens: 1024,
            stop: '.\n',
            temperature: 0.5,
        })
        
        message.reply(response.data.choices[0].text);
    }
    // darkjoke***
    else if(message.body.toLowerCase().startsWith("/darkjoke")) {
        if (Math.floor(Math.random() * 2) == 0) {
            const url = 'https://v2.jokeapi.dev/joke/Dark?type=twopart'
            try {
                https.get(url, (response) => {
                    response.on("data", (data) => {
                        let text = data.toString("utf8");
                        if (text.codePointAt(0) === 0xFEFF) {
                            text = text.substring(1);
                        }
                        let list = JSON.parse(text)
                        message.reply(list.setup + "\n\n" + list.delivery)    
                    })
                })
            } catch (e) {
                let media = MessageMedia.fromUrl('https://i.imgur.com/9fZoAIC.jpeg')
                message.reply(media)
            }
        } else {
            const url = 'https://v2.jokeapi.dev/joke/Dark?type=single'
            try {
                https.get(url, (response) => {
                    response.on("data", (data) => {
                        let text = data.toString("utf8");
                        if (text.codePointAt(0) === 0xFEFF) {
                            text = text.substring(1);
                        }
                        let list = JSON.parse(text)
                        message.reply(list.joke)
                    })
                })
            } catch (e) {
                let media = MessageMedia.fromUrl('https://i.imgur.com/9fZoAIC.jpeg')
                message.reply(media)
            }
        }
    }
})

// commands***
client.on('message', message => {
    if (message.body === "/help"){
        const commands = "*COMMANDS LIST*\n\n/sticker cute cat,, neko\n*Usage*: Reply or send an image, gif or video with this caption to make its sticker. Use ,, to separate description and author. Description and author are optional\n\n/tagall Special Announcement\n*Usage*: Tags everyone in the group. Tag Message is optional [Requires user to be an admin]\n\n/tagall-h\n*Usage*: Same as above but the tags are hidden. Tag Message is optional [Requires user to be an admin]\n\n/kick @user1 @user2 ...\n*Usage*: Kicks mention users [Requires both user and bot to be an admin]\n\n/add 919999988888\n*Usage*: Adds number to the group [Requires both user and bot to be an admin]\n\n/google GitHub\n*Usage*: Returns search results from google\n\n/wf integrate 5sinx/8x^2\n*Usage*: Get quick result from wolfram search engine (May take more time for complex queries)\n\n /g query\n*Usage*: Returns results from OpenAI's davinci model api\n\n /av _and_ /av @user\n*Usage*: Returns your profile picture and if mentioned a user returns profile picture of mentioned user\n\n /r greentext\n*Usage*: Returns random image from the given subreddit\n\n/darkjoke \n*Usage*: Returns cursed dark jokes"
        message.reply(commands)
    }
})

var checkAdmin = (part, auth) => {
    for(participant of part) {
        if (participant.id._serialized == auth && participant.isAdmin) {
            return true
        }
    }
    return false
}

client.on('group_join', async grp => {
    let chat = await grp.getChat()
    var media = await MessageMedia.fromUrl('https://i.imgur.com/wiiVudk_d.webp?maxwidth=760&fidelity=grand')
    chat.sendMessage(media, {caption: `Welcome to ${chat.name}.\n\n Hope you have a great time here\n\nType /help to check out my commands `})
})


