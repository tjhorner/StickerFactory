const Telegram = require('node-telegram-bot-api')
const jimp = require('jimp')

const bot = new Telegram(process.env.BOT_TOKEN, { polling: true })

var sessions = { }

var stateHandlers = {
  "loading": msg => { },
  "idle": msg => {
    if(msg.text) {
      if(msg.text.indexOf("/newpack") === 0) {
        bot.sendMessage(msg.from.id, "A new sticker pack! What shall we call it?")
        msg.session.command = "newpack"
        msg.session.state = "pack-name"
      } else if(msg.text.indexOf("/addstickers") === 0) {
        bot.sendMessage(msg.from.id, "Let's add some stickers! Send me a sticker from the pack you want to add stickers to.")
        msg.session.command = "addstickers"
        msg.session.state = "add-sticker-choose"
      } else if(msg.text.indexOf("/faq") === 0) {
        bot.sendMessage(msg.from.id, "*How do I delete/edit a sticker pack?*\nAll sticker packs I make are still owned by you, so you can edit them as you please through the @stickers bot. If you want to add more stickers to a pack, go ahead and send /addstickers to start the process.\n\n*Why do my sticker pack URLs have the ugly \"_by_TheStickerFactoryBot\" text in it?*\nThis is a Telegram restriction, and I wish I didn't have to add this suffix, but there's no way around it right now. Sorry!\n\n*Something broke! Who do I yell at?*\nGo ahead and tell @bcrypt. He'll fix it when he feels like it.", { parse_mode: "Markdown" })
      } else if(msg.text.indexOf("/start") === 0) {
        bot.sendMessage(msg.from.id, "Hello! Nice to meet you. I'm the Sticker Factory 🏭 bot.\n\nIn a nutshell, you give me some pictures that you want in a sticker pack, and I'll handle all the resizing and cropping for you. It's like magic! To create a sticker pack, use /newpack.")
      }
    }
  },
  "pack-name": msg => {
    if(msg.text) {
      if(msg.text.length >= 1 && msg.text.length <= 64) {
        bot.sendMessage(msg.from.id, "Great, now what do you want the pack's shortname to be? This will be part of the pack's URL. For example, it's the \"Animals\" bit in t.me/addstickers/Animals. It must be at most 40 characters.")
        msg.session.currentStickerPack.longName = msg.text.trim()
        msg.session.state = "pack-shortname"
      } else {
        bot.sendMessage(msg.from.id, "Sorry, but that's an invalid name. It must be between 1-64 characters.")
      }
    }
  },
  "pack-shortname": msg => {
    if(msg.text) {
      if(msg.text.length >= 1 && msg.text.length <= 40 && msg.text.trim().indexOf(" ") === -1) {
        bot.sendMessage(msg.from.id, "Ok, let's add your first sticker to this pack. No need to fiddle with resizing and adding borders — I'll handle that for you! Please send me an image to add. I recommend you use a PNG and send it to me as a *file*, not as an image.\n\nAlso, please be sure to add some emojis you want associated with the sticker in the caption.", { parse_mode: "Markdown" })
        msg.session.currentStickerPack.shortName = msg.text.trim()
        msg.session.state = "pack-add-first-sticker"
      } else {
        bot.sendMessage(msg.from.id, "Sorry, but that's an invalid shortname. It must be between 1-40 characters and contain no spaces.")
      }
    }
  },
  "pack-add-first-sticker": msg => {
    if(msg.document || msg.photo) {
      // console.log(msg.document)

      if(msg.document && (msg.document.mime_type === "image/png" || msg.document.mime_type === "image/jpeg")) {
        var fileId = msg.document.file_id
      } else if(msg.document) {
        bot.sendMessage(msg.from.id, "That's an invalid file! Please send a PNG or JPG image.")
        return
      }

      if(msg.photo)
        var fileId = msg.photo[msg.photo.length - 1].file_id

      if(!msg.caption) msg.caption = "🖼"

      bot.sendMessage(msg.from.id, "Thanks! Hold on a sec while I create your sticker pack...")
      msg.session.state = "loading"

      bot.getFileLink(fileId)
        .then(link => {
          return jimp.read(link)
        })
        .then(img => {
          img.autocrop().scaleToFit(512, 512).getBuffer("image/png", (err, buf) => {
            bot.createNewStickerSet(msg.from.id, `${msg.session.currentStickerPack.shortName}_by_TheStickerFactoryBot`, msg.session.currentStickerPack.longName, buf, msg.caption.trim())
              .then(res => {
                bot.sendMessage(msg.from.id, `Ok, your sticker pack has been created! [Check it out.](https://t.me/addstickers/${msg.session.currentStickerPack.shortName}_by_TheStickerFactoryBot)\n\nSend more pictures and I'll add them to the pack. Otherwise, send /cancel if you're done.`, { parse_mode: "Markdown" })
                msg.session.state = "pack-add-stickers"
                msg.session.currentStickerPack.shortName = `${msg.session.currentStickerPack.shortName}_by_TheStickerFactoryBot`
              })
              .catch(err => {
                bot.sendMessage(msg.from.id, "Couldn't add this sticker to the pack. This usually occurs when you use invalid emojis in your caption.")
              })
          })
        })
    }
  },
  "pack-add-stickers": msg => {
    if(msg.document || msg.photo) {
      // console.log(msg.document)

      if(msg.document && (msg.document.mime_type === "image/png" || msg.document.mime_type === "image/jpeg")) {
        var fileId = msg.document.file_id
      } else if(msg.document) {
        bot.sendMessage(msg.from.id, "That's an invalid file! Please send a PNG or JPG image.")
        return
      }

      if(msg.photo)
        var fileId = msg.photo[msg.photo.length - 1].file_id

      if(!msg.caption) msg.caption = "🖼"

      bot.getFileLink(fileId)
        .then(link => {
          return jimp.read(link)
        })
        .then(img => {
          img.autocrop().scaleToFit(512, 512).getBuffer("image/png", (err, buf) => {
            bot.addStickerToSet(msg.from.id, msg.session.currentStickerPack.shortName, buf, msg.caption.trim())
              .then(res => {
                bot.sendMessage(msg.from.id, "Added.", { reply_to_message_id: msg.message_id })
              })
              .catch(err => {
                console.log(err)
                bot.sendMessage(msg.from.id, "Couldn't add this sticker to the pack. This usually occurs when you use invalid emojis in your caption.", { reply_to_message_id: msg.message_id })
              })
          })
        })
    } else {
      bot.sendMessage(msg.from.id, "You're still adding images to your sticker pack. If you want to use another command, please send me /cancel to do so.")
    }
  },
  "add-sticker-choose": msg => {
    // console.log(msg)
    if(msg.sticker && msg.sticker.set_name) {
      if(msg.sticker.set_name.indexOf("_by_TheStickerFactoryBot") !== -1) {
        msg.session.state = "loading"
        bot.getStickerSet(msg.sticker.set_name)
          .then(set => {
            msg.session.currentStickerPack = {
              longName: set.title,
              shortName: set.name
            }
            bot.sendMessage(msg.from.id, `Ok, thanks! Send me some images you want to add to ${set.title} and then send /cancel when you're done.`)
            msg.session.state = "pack-add-stickers"
          })
      } else {
        bot.sendMessage(msg.from.id, "Unfortunately I can't add stickers to packs that weren't created with me. Sorry!")
      }
    }
  }
}

bot.on("message", msg => {
  if(!sessions[msg.from.id.toString()]) {
    sessions[msg.from.id.toString()] = {
      command: null,
      currentStickerPack: {
        shortName: null,
        longName: null
      },
      canCancel: true,
      state: "idle"
    }
  }

  var session = sessions[msg.from.id.toString()]
  msg.session = session

  // console.log(msg)

  if(msg.text && msg.text.indexOf("/cancel") === 0) {
    if(msg.session.command && msg.session.canCancel) {
      bot.sendMessage(msg.from.id, `The command ${msg.session.command} has been cancelled. Anything else I can do for you?`)
      msg.session.command = null
      msg.session.state = "idle"
    } else if(!msg.session.canCancel) {
      bot.sendMessage(msg.from.id, "Cancelling isn't available at the moment.")
    } else {
      bot.sendMessage(msg.from.id, "I wasn't doing anything, so I'm not really sure what you wanted me to cancel...")
    }
  } else {
    stateHandlers[session.state](msg)
  }
})

// bot.startPolling()