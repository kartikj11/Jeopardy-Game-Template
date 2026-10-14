// ==========================================================================
// Jeopardy Game Data Structure
// Imported from: https://jeopardylabs.com/play/golmaal-hai-bhai-sabh-golmaal-hai
//
// NOTE FOR EMBEDDING MEDIA (Audio / Video / YouTube):
// You can add media to any question object:
//   audio: "media/song.mp3",                          // Local audio (custom Diwali player)
//   video: "media/clip.mp4",                          // Local video (16:9 responsive frame)
//   youtube: "https://www.youtube.com/watch?v=...",    // YouTube video or Short (supports start/end)
//   start: 15, end: 45,                               // Optional start/end seconds
//   embed: "https://open.spotify.com/embed/track/..." // Spotify or iframe embed
// ==========================================================================

const gameData = {
    "The birthday boy lore": {
        100: {
            question: "His signature move the second he walks out the door is forgetting these three items.",
            hint: "Every single time he steps out the door...",
            answer: "What are phone, keys, and earphones 📱🔑🎧"
        },
        200: {
            question: "Ode to nizaam became his ode to this place.",
            hint: "A favorite foodie spot",
            answer: "What is Guerilla Diner 🍔"
        },
        300: {
            question: "While everyone assumes his toxic trait is joints or cigars, his actual weapon of choice is _____?",
            hint: "Puff puff...",
            answer: "What is Hookah / Sheesha 💨"
        },
        400: {
            question: "The ultimate comfort companion on his wishlist is a bag named...",
            hint: "Named after a beloved bear 🐻",
            answer: "What is Baloo 🎒"
        },
        500: {
            question: "Forget mainstream headliners—the one artist whose live set he would drop everything to see is this 'Gold' hitmaker.",
            hint: "Hit track 'Gold' (2015)",
            answer: "What is Kiiara 🎶"
        }
    },

    "Sangeet vangeet": {
        100: {
            question: "🎵 Listen to the beat and name that song / movie!",
            youtube: "https://youtu.be/fzv1uqd_1v8?si=VQxhZGtn0_i-VTo3",
            start: 0,
            end: 4,
            isAudio: true,
            hint: "Title track of Imran Khan & Sonam Kapoor rom-com",
            answer: "what is i hate luv storys"
        },
        200: {
            question: "🎵 Listen to the beat and name that song / movie!",
            youtube: "https://youtu.be/ANX4UZlW2JA?si=IptjS16bOEsaptGg",
            start: 0,
            end: 8,
            isAudio: true,
            hint: "Sufi-thumri club banger from JugJugg Jeeyo",
            answer: "what is Rangisari"
        },
        300: {
            question: "🎵 Listen to the beat and name that song / movie!",
            youtube: "https://youtu.be/OF688uk3Il0?si=WRJpTSZaTRQHfGVD",
            start: 0,
            end: 8,
            isAudio: true,
            hint: "Iconic A.R. Rahman youth anthem from Rang De Basanti",
            answer: "what is Roobaroo"
        },
        400: {
            question: "🎵 Listen to the beat and name that song / movie!",
            youtube: "https://youtu.be/6HUYAfCB728?si=JeglT95NyDAO73dL",
            start: 0,
            end: 8,
            isAudio: true,
            hint: "Arijit Singh track from Holiday (Akshay Kumar & Sonakshi Sinha)",
            answer: "what is Aaj Dil Shayrana"
        },
        500: {
            question: "🎵 Listen to the beat and name that song / movie!",
            youtube: "https://youtu.be/ofTxceS4wLI?si=Y_mAzkY6XnHYEhhU",
            start: 0,
            end: 7,
            isAudio: true,
            hint: "Soulful track from OK Jaanu composed by A.R. Rahman",
            answer: "what is Enna Sona"
        }
    },

    "Chronically online": {
        100: {
            question: "Name this viral internet meme / soundbite!",
            hint: '"Wait a minute... who are you?"',
            answer: 'What is Kazoo Kid ("Who are you?") 🎺'
            // video: "media/kazookid.mp4",
            // youtube: "https://www.youtube.com/watch?v=...",
        },
        200: {
            question: "Which weighs more: a kilogram of steel, or a kilogram of feathers?",
            hint: "Think carefully before answering...",
            answer: "What is a kilogram of steel or a kilogram of feathers (they weigh the same!)"
            // youtube: "https://www.youtube.com/watch?v=...",
        },
        300: {
            question: "Complete the iconic meme / reaction: 'Maaf karna gusse mein thoda idhar udhar nikal jata hoon...' / '_____!'",
            hint: "Viral Pakistani interview reaction",
            answer: "What is Abbey Saale! ('Abey saale... maaf karna gusse mein thoda idhar udhar nikal jata hoon!')"
            // youtube: "https://www.youtube.com/watch?v=...",
        },
        400: {
            question: "Name this viral internet quote / meme from an upset kid being filmed on the street!",
            hint: '"...I\'ve got school!"',
            answer: "What is 'It's not funny, I've got school!' 🎒"
            // youtube: "https://www.youtube.com/watch?v=...",
        },
        500: {
            question: "Name this legendary internet meme of a toddler on a beach making a determined fist pump with sand in his hand.",
            hint: "Viral victory meme",
            answer: "What is Success Kid ✊"
            // image: "media/success_kid.jpg",
        }
    },

    "Main character energy only": {
        100: {
            question: "Name the movie featuring this iconic Bollywood main character moment / scene!",
            hint: "High-octane action thriller starring Hrithik Roshan & Aishwarya Rai",
            answer: "What is Dhoom 2 🏍️"
            // video: "media/dhoom2.mp4",
            // youtube: "https://www.youtube.com/watch?v=...",
        },
        200: {
            question: "Name the movie featuring this dramatic main character energy scene!",
            hint: "Starring Shah Rukh Khan, Rani Mukerji, Preity Zinta, Abhishek Bachchan",
            answer: "What is Kabhi Alvida Naa Kehna 🎬"
            // video: "media/kank.mp4",
        },
        300: {
            question: "Name the movie featuring this iconic main character moment!",
            hint: "Rohit & Jadoo 👽",
            answer: "What is Koi... Mil Gaya 🛸"
            // video: "media/koimilgaya.mp4",
        },
        400: {
            question: "Name the movie featuring this ambitious Delhi wedding-planning duo!",
            hint: "Bittoo Sharma & Shruti Kakkar",
            answer: "What is Band Baaja Baaraat 🎪"
            // video: "media/bbb.mp4",
        },
        500: {
            question: "Name the movie featuring this suave conman who tricks women until they team up for revenge!",
            hint: "Starring Ranveer Singh & Anushka Sharma",
            answer: "What is Ladies vs Ricky Bahl 💼"
            // video: "media/rickybahl.mp4",
        }
    },

    "3 more shots please !!": {
        100: {
            question: "The innocent-sounding cocktail that packs equal shots of nearly every clear liquor behind the bar.",
            hint: "Vodka, rum, gin, tequila, triple sec...",
            answer: "LIIT! LIIT! LIIT! (Long Island Iced Tea) 🍹"
        },
        200: {
            question: "The legendary, hyper-addictive Japanese drink that is part of every late-night dinner.",
            hint: "Served warm or chilled 🍶",
            answer: "Sake! Sake! Sake! 🍶"
        },
        300: {
            question: "The indigenous Indian liquor distilled from Mahua flowers or cashew apples that is finally getting its craft-cocktail renaissance.",
            hint: "Goan heritage drink 🌴",
            answer: "Feni! Feni! Feni! 🥃"
        },
        400: {
            question: "The trendy, crystal-clear Mexican beer that everyone drinks with a wedge of lime jammed into the neck.",
            hint: "Served ice cold with a fresh lime wedge 🍋",
            answer: "Corona! Corona! Corona! 🍺"
        },
        500: {
            question: "The Haryana single malt that sparked nationwide bar shortages after beating top Scottish whiskies at global awards.",
            hint: "Piccadilly Distilleries 🏆",
            answer: "INDRI! INDRI! INDRI! (Indri Trini) 🥃"
        }
    }
};
