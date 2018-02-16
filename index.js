const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const token = process.env.FB_TOKEN;

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.send('Hey! We are up!');
})

app.get('/fbhook/', function (req, res) {
  // To validate the webhook facebook sends a hub.verify_token on the query
  // We need to answer with the challenge so it confirms we own the webhook
  // This is a one time operation

  if (req.query['hub.verify_token'] === 'verifytoken') {
    res.send(req.query['hub.challenge']);
  }
});

app.post('/fbhook/', function (req, res) {
  // Sample body.entry received from Facebook (some nodes are stripped out)
  //
  // {
  //   "entry": [
  //     {
  //       "id": "222062301673587",
  //       "messaging": [
  //         {
  //           "sender": {
  //             "id": "1172414162861909"
  //           },
  //           "recipient": {
  //             "id": "222062301673587"
  //           },
  //           "timestamp": 1518784654572,
  //           "message": {
  //             "text": "Hello",
  //             "nlp": {
  //               "entities": {
  //                 "greetings": [
  //                    {
  //                      "confidence": 0.99988770484656,
  //                      "value": "true",
  //                      "_entity": "greetings"
  //                    }
  //                 ]
  //               }
  //             }
  //           }
  //         }
  //       ]
  //     }
  //   ]
  // }

  let messaging_events = req.body.entry[0].messaging;

  for (let i = 0; i < messaging_events.length; i++) {
    let event = messaging_events[i];
    let sender = event.sender.id;

    if(event.message && event.message.text) {
      let responseText = responseToNlp(event.message.nlp) || event.message.text.toUpperCase();
      // sendTextMessage(sender, responseText);
      sendStructuredMessage(sender);
    }
  }

  res.sendStatus(200);
});

function sendTextMessage(sender, text) {
  // Facebook docs: https://developers.facebook.com/docs/messenger-platform/reference/send-api/
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: { text: text }
    }
  });
}

function responseToNlp(nlp) {
  // Sample nlp object
  //
  // "nlp": {
  //   "entities": {
  //     "greetings": [
  //        {
  //          "confidence": 0.99988770484656,
  //          "value": "true",
  //          "_entity": "greetings"
  //        }
  //     ]
  //   }
  // }

  let responses = {
    greetings: ['Hello! How are you?', 'Olá! Como está?', '¡Hola amigo!'],
    bye: ['Bye!', 'See you!', 'Tchau!', '👋']
  }[Object.keys(nlp.entities)[0]];

  if(responses) {
    return sample(responses);
  }
}

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function sendStructuredMessage(sender) {
  let data = {
    "attachment": {
      "type": "template",
      "payload": {
      "template_type": "generic",
        "elements": [{
        "title": "Card #1",
          "subtitle": "Subtitle #1",
          "image_url": "https://en.facebookbrand.com/wp-content/uploads/2016/09/messenger_icon2.png",
          "buttons": [{
            "type": "web_url",
            "url": "https://developers.facebook.com/docs/messenger-platform/reference/send-api/",
            "title": "Messenger API Reference"
          }],
        }, {
          "title": "Card #2",
          "subtitle": "Subtitle #2",
          "image_url": "https://en.facebookbrand.com/wp-content/uploads/2016/09/messenger_icon2.png",
          "buttons": [{
            "type": "web_url",
            "url": "https://developers.facebook.com/docs/messenger-platform/reference/send-api/",
            "title": "Same as the other one"
          }],
        }]
      }
    }
  };

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: data
    }
  });
}

app.listen(app.get('port'));
