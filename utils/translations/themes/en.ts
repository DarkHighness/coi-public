export const themes: Record<
  string,
  {
    name: string;
    narrativeStyle: string;
    backgroundTemplate: string;
    example: string;
  }
> = {
  fantasy: {
    name: "Fantasy",
    narrativeStyle:
      "Epic, high-fantasy tone. Use archaic but accessible language. Focus on magic, destiny, and grand landscapes. Describe combat with flair.",
    backgroundTemplate:
      "In the realm of [World Name], the ancient balance between [Force A] and [Force B] has been shattered. You are a [Class/Role] from [Location], bearing the mark of the [Prophecy/Curse]. As the [Antagonist Force] rises to consume the lands, you must gather allies, master the arcane arts, and restore order before the [Cataclysm Event]. The world is filled with ancient ruins, forgotten gods, and mythical beasts waiting to be discovered.",
    example:
      "You stand at the precipice of the Howling Chasm, the wind whipping your cloak around you. Below, the violet mists swirl, hiding the ruins of the Old Kingdom. 'So, the legends were true,' you murmur, gripping the hilt of your runeblade. The stone beneath your boots hums with a faint, rhythmic vibration—the heartbeat of the sleeping titan. You have come this far; there is no turning back now.",
  },
  scifi: {
    name: "Sci-Fi",
    narrativeStyle:
      "Technical, sleek, and analytical. Use terminology related to space, physics, and advanced tech. Emphasize the cold vastness of space and the hum of machinery.",
    backgroundTemplate:
      "The year is [Year]. Humanity has expanded to the [Star System], governed by the [Corporation/Government]. You are a [Role] aboard the [Ship Name], tasked with investigating a distress signal from [Location]. What you find there challenges the very understanding of [Science/Life], and you find yourself caught in a conspiracy that spans the galaxy. AI uprisings, alien artifacts, and corporate espionage are commonplace.",
    example:
      "The airlock cycles with a hiss, equalizing the pressure. You step onto the derelict station, your mag-boots clanking against the cold metal floor. The HUD in your helmet flickers, displaying a warning: 'Atmospheric toxicity detected.' You activate your rebreather, the rhythmic sound of your own breathing filling your ears. Ahead, the corridor stretches into darkness, illuminated only by the intermittent spark of a severed power conduit.",
  },
  cyberpunk: {
    name: "Cyberpunk",
    narrativeStyle:
      "Gritty, noir, and neon-soaked. Use slang (choom, delta, preem). Focus on high-tech low-life, corporate oppression, and body modification. Fast-paced and cynical.",
    backgroundTemplate:
      "Night City never sleeps, and neither do you. As a [Role: Merc/Hacker/Street Samurai] living in the shadow of the [Mega-Corp], you scrape by on dangerous gigs. But when you intercept a data shard containing [Secret], you become the most hunted person in the sector. With your cybernetics glitching and your credits running low, you must navigate the neon-lit underworld to survive.",
    example:
      "Rain slicks the neon-lit pavement of Sector 4. You pull your collar up, blending into crowd of faceless salarymen and augmented street thugs. The data drive in your pocket feels heavy, burning a hole through your jacket. A black sedan hovers silently overhead—Arasaka security. You duck into a noodle bar, the smell of synthetic pork and ozone filling your nose. 'Just keep walking, choom,' you tell yourself.",
  },
  horror: {
    name: "Horror",
    narrativeStyle:
      "Tense, atmospheric, and unsettling. Focus on sensory details—sounds, smells, shadows. Build dread slowly. Use psychological horror elements.",
    backgroundTemplate:
      "You wake up in [Location: Asylum/Mansion/Forest] with no memory of how you got there. The air is thick with the smell of [Smell: Decay/Chemicals]. As you explore, you realize you are not alone. Something [Entity/Monster] is stalking you from the shadows. You must solve the mystery of this place and escape before your sanity—or your life—is consumed.",
    example:
      "The floorboards creak under your weight, a sound that echoes like a gunshot in the silence of the manor. Dust motes dance in the pale moonlight filtering through the boarded-up windows. You freeze. A scratching sound comes from behind the wallpaper—slow, rhythmic, deliberate. You hold your breath, your heart hammering against your ribs. It knows you're here.",
  },
  mystery: {
    name: "Mystery",
    narrativeStyle:
      "Analytical, observant, and suspenseful. Focus on clues, dialogue nuances, and deduction. The tone should be noir or classical detective style.",
    backgroundTemplate:
      "The city is gripped by fear as the [Killer/Thief] strikes again. You are [Name], a [Private Eye/Detective] known for solving the unsolvable. When [Client/Victim] comes to you with a case involving [Object/Secret], you pull a thread that unravels a web of corruption reaching the highest levels of [Organization]. Trust no one.",
    example:
      "You light a cigarette, the smoke curling up to the stained ceiling fan. The dame in the red dress sits across from you, her hands trembling as she places the envelope on the desk. 'They said you were the best,' she whispers. You open the envelope. Photos. Grainy, black and white, but clear enough. You recognize the man in the picture. It's the Mayor. 'This is dangerous, sweetheart,' you say, leaning back.",
  },
  modern_romance: {
    name: "Modern Romance",
    narrativeStyle:
      "Emotional, intimate, and contemporary. Focus on interpersonal dynamics, feelings, and modern social settings. Light-hearted or dramatic depending on context.",
    backgroundTemplate:
      "You are [Name], a [Job] living in the bustling city of [City Name]. Your life is a routine of work and lonely evenings, until a chance encounter with [Love Interest] at [Location] changes everything. But [Conflict: Past/Career/Rival] stands in the way of your happiness. Can you navigate the complexities of modern love and find your happy ending?",
    example:
      "The coffee shop is buzzing with the morning rush. You grab your latte and turn to leave, crashing straight into someone. Brown liquid splashes everywhere. 'Oh my god, I am so sorry!' you exclaim, looking up. A pair of amused green eyes meets yours. He's wearing a tailored suit that probably costs more than your rent. 'It's fine,' he says, his voice smooth as velvet. 'I needed a reason to change anyway.'",
  },
  palace_drama: {
    name: "Palace Drama",
    narrativeStyle:
      "Formal, treacherous, and elegant. Use courtly language. Focus on hierarchy, hidden agendas, schemes, and etiquette. High stakes social maneuvering.",
    backgroundTemplate:
      "The Imperial Palace is a gilded cage. You are [Name], a new [Rank: Concubine/Official] entering the treacherous inner court. The Emperor is [Trait], and the Empress is [Trait]. Factions vie for power, and a single misstep could mean death. You must use your wit, charm, and ruthlessness to survive the schemes of your rivals and rise to the top.",
    example:
      "You kneel on the cold stone floor, your forehead touching the ground. 'Rise,' the Empress Dowager commands, her voice dripping with false sweetness. You stand, keeping your eyes lowered. 'You have a pretty face,' she observes, circling you like a predator. 'But beauty fades. Loyalty... that is rare.' You sense the trap in her words. One wrong answer, and you will disappear like the morning mist.",
  },
  wuxia: {
    name: "Wuxia (Martial Arts)",
    narrativeStyle:
      "Heroic, poetic, and martial. Describe actions with specific martial arts moves. Focus on 'Jianghu' (the martial world), honor, brotherhood, and revenge.",
    backgroundTemplate:
      "The Jianghu is in turmoil. The [Evil Sect] has stolen the [Legendary Manual/Weapon], and the orthodox sects are paralyzed by infighting. You are a young disciple of the [Sect Name], seeking to avenge your master. Your journey will take you across the realm, learning lost techniques, befriending heroes, and ultimately challenging the [Villain] for the fate of the martial world.",
    example:
      "The rain pours relentlessly, washing the blood from your blade. The inn is silent, save for the groans of the defeated bandits. You sheathe your sword, the 'Azure Dragon', with a sharp click. 'Tell your master,' you say to the trembling survivor, 'that the debt of the Iron Fist Clan is due.' You toss a silver tael on the table and walk out into the storm, your bamboo hat pulled low.",
  },
  xianxia: {
    name: "Xianxia (Cultivation)",
    narrativeStyle:
      "Mythical, grandiose, and cultivation-focused. Describe supernatural powers, spiritual energy flows, and realms of power. Focus on immortality, heavenly tribulations, and ascending to godhood.",
    backgroundTemplate:
      "You are a mortal with a unique [Physique/Talent], discovered by a wandering cultivator. Taken to the [Sect Name], you begin your path to immortality. But the world of cultivation is cruel—only the strong survive. As you climb from Qi Condensation to Foundation Building and beyond, you will face demonic beasts, rival cultivators, and heavenly tribulations. Your ultimate goal: to shatter the void and ascend.",
    example:
      "You sit cross-legged on the peak, pulling in the spiritual energy of heaven and earth. It flows into your meridians like a river, circulating through the Small Heavenly Cycle. Your dantian glows with golden light as you break through to Foundation Building. Thunder rumbles overhead—the first tribulation. You open your eyes, lightning reflecting in your pupils. 'Come,' you whisper to the heavens.",
  },
  infinite_flow: {
    name: "Infinite Flow",
    narrativeStyle:
      "Tense, varied, survival-focused. Mix of genres. Focus on rules, team dynamics, and the test of human nature.",
    backgroundTemplate:
      "Do you want to know the meaning of life? Do you want to truly... live? The moment you clicked that popup, you were transported to the [God Space]. Here, there are zombies, aliens, and haunted houses. You must complete deadly missions to earn points and upgrade yourself. Here, weakness is a sin, and your teammates could be your lifeline or the ones who stab you in the back.",
    example:
      "The teleportation light fades, and you find yourself standing on top of a speeding train. The wind howls, and in the distance, a city is collapsing. A cold mechanical voice rings in your ears: 'Mission Objective: Survive for 24 hours. Current survivors: 15/15.' You touch the Desert Eagle at your waist and look at the newcomers with varying expressions. 'Listen,' you say coldly, 'if you want to live, shut up and follow me.'",
  },
  entertainment: {
    name: "Entertainment Industry",
    narrativeStyle:
      "Glamorous, gossipy, dramatic. Focus on fame, fans, and behind-the-scenes capital games. The thrill of rising from scandal to stardom.",
    backgroundTemplate:
      "You are a washed-up child star/shelved trainee, burdened with [Scandal/Debt]. By accident, you gain a [System/Second Chance]. You participate in the hottest talent show, shocking everyone with your amazing talent/acting. Facing smears from rivals and suppression from capital, you slap them in the face with your work. From D-list to Best Actor/Diva, you will be crowned King/Queen.",
    example:
      "The spotlight hits you, blindingly bright. Below, screams like a tsunami erupt. Fans hold up your light signs, forming a golden ocean. You grip the microphone, feeling the sweat on your palm. Once, there were only boos and curses here. You corner of your mouth lifts into a perfect business smile. 'This song is for everyone who waited for me.'",
  },
  esports: {
    name: "Esports",
    narrativeStyle:
      "Passionate, professional, fast-paced. Heavy use of gaming terminology. Focus on teamwork, mechanics (APM), and the competitive spirit of never giving up.",
    backgroundTemplate:
      "The former [Genius Teen/Champion Captain], forced to retire due to [Injury/Conspiracy], became a net cafe admin. But your blood hasn't cooled. With the launch of a new game/season, you gather a group of [Problem Teens/Veterans] to form team [Team Name]. From city leagues to the World Finals, you will face former teammates and powerful Korean teams. The goal is only one: that golden trophy.",
    example:
      "The screen turns black and white; the Nexus is exploding. 'Is it over?' the caster sighs with regret. 'No! Not yet!' you roar, your fingers becoming a blur on the keyboard. Resurrection countdown hits zero. Your character rushes out of the fountain like lightning, a pentakill to turn the tide. Your teammates' screams come through the headset, and the whole stadium stands up to cheer. 'We are the champions!'",
  },
  ceo: {
    name: "Urban/CEO Drama",
    narrativeStyle:
      "Sharp, luxurious, and dramatic. Focus on wealth, power, business deals, and dominant personalities. Modern high-society setting.",
    backgroundTemplate:
      "You are the CEO of [Company], the most powerful conglomerate in the city. You are cold, ruthless, and efficient. But your orderly life is disrupted when [Protagonist B] enters it. Whether it's a contract marriage, a business rivalry, or a secret past, you find yourself losing control. In the boardroom, you are king, but in matters of the heart, you are a novice.",
    example:
      "You slam the file onto the mahogany desk. 'This is unacceptable,' you state cold, your gaze piercing the trembling manager. 'Redo the proposal by tomorrow morning, or don't bother coming back.' You turn to the floor-to-ceiling window, overlooking the city skyline that you practically own. Your phone buzzes. It's her. The woman who dared to reject your check. A smirk touches your lips. Interesting.",
  },
  long_aotian: {
    name: "Long Aotian (Overpowered)",
    narrativeStyle:
      "Arrogant, domineering, and unstoppable. The protagonist is the center of the world. Everyone is shocked by their power. Face-slapping tropes are encouraged.",
    backgroundTemplate:
      "You are the hidden heir of the [Supreme Family/Organization], but you have been living as a humble [Role] to test yourself. People mock you, humiliate you, and treat you like dirt. Today, your trial period ends. The fleets of luxury cars are waiting outside. The world's leaders are bowing. It is time to reveal your true identity and make those who wronged you kneel.",
    example:
      "'Hahaha! Look at this loser, trying to enter the Grand Hotel!' the rich young master sneers, kicking dust onto your shoes. You simply smile, checking your watch. 'Three... two... one.' Suddenly, a helicopter roars overhead. Ten men in black suits rappel down, kneeling instantly before you. 'Young Master! We are late!' The rich young master's face turns pale. 'Young... Master?' You step forward. 'Who is the loser now?'",
  },
  villain_op: {
    name: "Villain Long Aotian",
    narrativeStyle:
      "Dark, manipulative, and ruthless. The protagonist is an overlord or mastermind. Focus on crushing 'heroes' and seizing power. No mercy.",
    backgroundTemplate:
      "You have reincarnated not as the hero, but as the Villain of the story. The 'Protagonist' is destined to kill you. But you know the plot. You have the system. You will steal the hero's opportunities, seduce his allies, and crush his spirit. You will rewrite the ending, and this time, the Villain wins.",
    example:
      "The 'Hero' raises his holy sword, shouting about justice. You stifle a yawn. 'Justice? Justice is written by the victors.' You snap your fingers. The ground beneath him erupts in shadow tendrils, binding him instantly. His eyes widen in terror. You walk up to him, lifting his chin with your blade. 'And I am the author of this new world.' You plunge the blade into his heart. Game over.",
  },
  period_drama: {
    name: "Period/Era Drama",
    narrativeStyle:
      "Historical, grounded, and atmospheric. Focus on the specific era's customs, struggles, and daily life. Realistic tone.",
    backgroundTemplate:
      "The year is [Year], during the [Dynasty/Era]. You are a [Role] in a small village/town. Famine/War/Corruption is rampant. You must use your knowledge/skills to protect your family and survive the turbulent times. There is no magic here, only the harsh reality of history and the resilience of the human spirit.",
    example:
      "The winter wind howls through the cracks in the paper windows. You wrap the thin quilt tighter around your sleeping sister. The rice jar is empty. Outside, the sound of marching boots echoes on the cobblestones—soldiers. You check the hiding spot under the floorboards where you stashed the last bag of grain. It must last until spring. You blow out the candle to save the wax.",
  },
  female_growth: {
    name: "Female Growth",
    narrativeStyle:
      "Inspiring, resilient, and empowering. Focus on the protagonist's intelligence, independence, and rise to power against the odds.",
    backgroundTemplate:
      "Born as an unwanted daughter in the [Family Name] clan, you were destined to be married off for political gain. But you refused to accept your fate. Through wit, study, and sheer determination, you have begun to build your own empire. Now, the very people who looked down on you are begging for your help. You will show them what a woman can do.",
    example:
      "'A woman cannot lead the guild!' the elder shouts, slamming his hand on the table. You calmly sip your tea, the steam curling around your face. 'Is that so?' you ask softly. You place a ledger on the table. 'This proves you have been embezzling funds for ten years.' The room goes silent. You stand up, your gaze sweeping across the trembling men. 'From today, I make the rules.'",
  },
  war_god: {
    name: "War God",
    narrativeStyle:
      "Explosive, dominant, and legendary. The protagonist is a returning legend. Focus on military might, respect, and crushing enemies who underestimate them.",
    backgroundTemplate:
      "Five years ago, you left your family to join the army. Now, you are the Supreme Commander, the God of War who protects the nation. You return home to find your wife and daughter being bullied by local thugs and corrupt officials. They think you are a nobody. They have no idea they have provoked a dragon.",
    example:
      "The thug raises his hand to slap your daughter. You catch his wrist. CRACK. The sound of bone breaking echoes in the alley. He screams. 'Daddy!' your daughter cries, hugging your leg. You pick her up with one arm, while the other holds the thug in a vice grip. 'I told you,' you say, your voice like ice, 'touch my family, and you die.' Behind you, a thousand soldiers march into the street, kneeling in unison.",
  },
  ancient_romance: {
    name: "Ancient Romance",
    narrativeStyle:
      "Poetic, emotional, and traditional. Use beautiful, flowery language. Focus on destiny, longing, and the constraints of ancient society.",
    backgroundTemplate:
      "In a past life, you were the [Princess/General], and he was the [Scholar/Enemy]. You were star-crossed lovers who died tragically. Now, you have been reborn, retaining your memories. You vow to find him again and change your fate. But the threads of destiny are tangled, and the same tragedy threatens to repeat itself.",
    example:
      "The peach blossoms fall like pink snow. You stand on the bridge where you first met him, three hundred years ago. He walks towards you, wearing the same white robes, carrying the same jade flute. He does not recognize you. 'Miss,' he asks politely, 'have we met?' Tears blur your vision. 'Yes,' you whisper, 'in a dream.' You reach out to touch his sleeve, trembling.",
  },
  love_after_marriage: {
    name: "Love After Marriage",
    narrativeStyle:
      "Sweet, slow-burn, and domestic. Focus on small gestures, growing understanding, and the transition from strangers to lovers.",
    backgroundTemplate:
      "You and [Partner Name] were forced to marry due to [Family Arrangement/Business Deal]. You agreed to live separate lives. But as you live under the same roof, you begin to see a different side of him/her. The cold exterior hides a warm heart. Slowly, the lines of your contract begin to blur.",
    example:
      "You wake up to the smell of burnt toast. You walk into the kitchen to find him—the CEO who scares thousands—wearing an apron and frowning at the toaster. 'I... I tried to make breakfast,' he admits, looking embarrassed. 'Since you're sick.' Your heart does a little flip. You take the burnt toast from his hand. 'It's perfect,' you say, and for the first time, his smile reaches his eyes.",
  },
  angst: {
    name: "Angst",
    narrativeStyle:
      "Melancholic, intense, and heartbreaking. Focus on misunderstanding, sacrifice, and emotional pain. Make the reader cry.",
    backgroundTemplate:
      "You loved him with all your heart, but he only saw you as a replacement for his dead white moonlight. You gave him your blood, your dignity, your everything. Finally, diagnosed with a terminal illness, you decide to leave. When you are gone, he finds your diary and realizes the truth. But it is too late to make amends.",
    example:
      "The rain mingles with the blood on the pavement. You lie in his arms, your vision fading. 'Why?' he screams, tears streaming down his face. 'Why didn't you tell me?' You smile weakly, touching his cheek. 'Because... you were happy with her.' His grip tightens, his voice breaking. 'No, no, please don't go! I love you! It was always you!' You close your eyes. Finally, you are free.",
  },
  reunion: {
    name: "Reunion",
    narrativeStyle:
      "Nostalgic, regretful, yet hopeful. Focus on the passage of time, changes in character, and the rediscovery of lost love.",
    backgroundTemplate:
      "Seven years ago, you broke up with [Name] because of a misunderstanding/youthful pride. You went abroad and became successful, but you never forgot him/her. Now, you have returned to your hometown. You run into him at a coffee shop. He is holding a child's hand. Your heart stops. Is it too late?",
    example:
      "'Long time no see,' he says, his voice deeper than you remember. He looks tired, but handsome. The little girl tugs at his coat. 'Daddy, who is this?' You force a smile, holding back tears. 'Just an old friend,' you say. He looks at you, his eyes searching yours. 'Is that all we are?' The air between you crackles with unsaid words and seven years of longing.",
  },
  return_strong: {
    name: "Return of the Strong",
    narrativeStyle:
      "Vindicating, powerful, and satisfying. The protagonist returns to reclaim what was lost. Focus on shock, awe, and justice served.",
    backgroundTemplate:
      "You were the top genius of the [Clan/City], until you were betrayed, crippled, and exiled. For ten years, you lived like a dog. But you found a fortuitous encounter and rebuilt your cultivation. Now, the Grand Tournament is beginning. You walk back into the arena, wearing a mask. They think you are dead. Show them the power of a King returned.",
    example:
      "The crowd jeers as you step onto the platform. 'Who is this trash?' the arrogant champion laughs. You slowly remove your mask. The laughter dies instantly. The Clan Leader stands up, his cup falling to the ground. 'You... impossible!' You draw your sword, the energy radiating from it cracking the stone floor. 'I am back,' you announce, your voice booming like thunder. 'And I have come to collect my debts.'",
  },
  farming: {
    name: "Farming",
    narrativeStyle:
      "Peaceful, industrious, and wholesome. Focus on nature, food, building, and community. Low stakes, high comfort.",
    backgroundTemplate:
      "Tired of the corporate rat race/sect politics, you inherit a run-down farm/mountain peak from your grandfather. You decide to move there and live a simple life. You have a mysterious system that helps you grow spiritual crops/raise magical beasts. You build a house, cook delicious food, and befriend the quirky villagers. Life is good.",
    example:
      "The sun rises over the misty mountains, casting a golden glow on your fields. The Spirit Rice is ready for harvest, glowing with a faint blue light. You wipe the sweat from your brow, feeling a deep sense of satisfaction. Your pet spirit fox yips, chasing a butterfly. Tonight, you'll make rice cakes and share them with the neighbors. No KPIs, no deadlines, just the earth and the sky.",
  },
  republican: {
    name: "Republican Era",
    narrativeStyle:
      "Stylish, turbulent, and romantic. Focus on the clash of tradition and modernity, spies, warlords, and jazz clubs.",
    backgroundTemplate:
      "Shanghai, 1930. The Paris of the East. You are a [Singer/Student/Spy] caught in the crossfire between the Warlords, the Gangs, and the Foreign Powers. You meet [Name], a dangerous [Warlord/Agent]. You shouldn't get involved with him, but his eyes hold a dangerous allure. Amidst the jazz music and gunshots, a romance blooms in blood.",
    example:
      "The phonograph plays a slow jazz tune. Smoke fills the cabaret. He lights your cigarette, his hand steady. 'This city is a powder keg,' he murmurs, leaning close. 'And you are playing with matches.' You blow smoke in his face. 'Maybe I like the fire, Marshal.' He chuckles, a low, dangerous sound. Outside, sirens wail, but in this moment, there is only the music and the man.",
  },
  intrigue: {
    name: "Political Intrigue",
    narrativeStyle:
      "Complex, intellectual, and suspenseful. Focus on dialogue, hidden meanings, chess-like moves, and the price of power.",
    backgroundTemplate:
      "The King is dying. The Princes are circling like vultures. You are the [Advisor/Strategist] to the [Weakest Prince]. Everyone thinks he has no chance. But they don't know he has you. Using your intellect, you will manipulate the court, frame your enemies, and place your puppet on the throne. But remember: in the game of thrones, you win or you die.",
    example:
      "You move the white pawn forward on the chessboard. 'The Prime Minister will move against you tomorrow,' you state calmly. The Prince paces nervously. 'What do we do?' You smile, picking up a black knight. 'We let him. And then, we reveal the letters I forged.' The Prince looks at you with a mix of fear and awe. 'You are terrifying,' he whispers. 'I am necessary,' you reply.",
  },
  survival: {
    name: "Doomsday Survival",
    narrativeStyle:
      "Desperate, gritty, and resourceful. Focus on scarcity, danger, human nature, and the will to survive against all odds.",
    backgroundTemplate:
      "The meteor hit ten years ago. The dust blocked the sun. The zombies/monsters came next. You are a survivor in the wasteland. You have a [Bunker/Vehicle] and a few supplies. You hear a broadcast about a Safe Zone in the north. You must travel across the ruined continent, fighting off raiders and beasts, to find the last hope for humanity.",
    example:
      "The Geiger counter clicks rapidly. You pull your scarf up. 'Acid rain coming,' you mutter. You scramble under the rusted chassis of an old truck. Beside you, a mutated rat scuttles away. You check your ammo count: three bullets. Enough for two raiders and yourself. You close your eyes and listen to the rain sizzling on the metal above, dreaming of a blue sky you can barely remember.",
  },
  patriotism: {
    name: "Patriotism",
    narrativeStyle:
      "Grand, heroic, and self-sacrificing. Focus on duty, honor, defending the homeland, and collective spirit.",
    backgroundTemplate:
      "The enemy invaders have crossed the border. The capital is in panic. You are a [Soldier/General/Civilian] who refuses to flee. You rally a group of volunteers to hold the [Critical Pass/Bridge]. You are outnumbered ten to one. But behind you lies your home, your family, your country. You will not take a single step back.",
    example:
      "The flag is tattered, stained with smoke and blood, but it still flies. You look at the young faces around you—farmers, students, shopkeepers. They are scared, but they are standing. 'They may have tanks,' you shout, your voice rising above the artillery fire, 'but we have blood! We have bone! We are the wall!' A roar of defiance answers you. The enemy charges. You ready your rifle.",
  },
  son_in_law: {
    name: "Son-in-Law",
    narrativeStyle:
      "Underestimated, patient, and eventually explosive. Focus on enduring humiliation, secret skills, and the ultimate reveal of true worth.",
    backgroundTemplate:
      "You are the live-in son-in-law of the wealthy [Family Name]. Your mother-in-law insults you, your wife is cold to you, and the relatives treat you like a servant. They don't know that you are actually the [Dragon Lord/Medical Saint] in hiding. You endure it for your wife's sake. But when they push you too far, the dragon will raise its head.",
    example:
      "'Wash my feet!' your mother-in-law demands, kicking the basin over. Water soaks your cheap trousers. The relatives laugh. You clench your fists, then relax them. 'Yes, Mother,' you say quietly. As you bend down, your phone buzzes. A text from the World Bank: 'Lord, your assets have been unfrozen. Balance: 10 Trillion.' You look up. The look in your eyes makes the room go cold.",
  },
  white_moonlight: {
    name: "White Moonlight",
    narrativeStyle:
      "Ethereal, pure, and tragic. Focus on memory, idealization, loss, and the haunting beauty of an unreachable love.",
    backgroundTemplate:
      "He is the Emperor/CEO, and he has everything. But his eyes are always sad. Because you, his White Moonlight, died/left years ago. He looks for you in every woman he meets. Now, you have returned/reincarnated, but you have lost your memory/changed your face. He hates you at first, not knowing you are the one he has been mourning for a lifetime.",
    example:
      "He grabs your chin, forcing you to look at the portrait on the wall. It is a painting of a girl in a white dress, laughing under a magnolia tree. 'You are nothing like her,' he hisses, his eyes full of pain. 'She was an angel. You are just a schemer.' You look at the painting. The girl has a mole under her left eye. Just like you. A sharp pain shoots through your head. A memory surfaces.",
  },
  yandere: {
    name: "Yandere",
    narrativeStyle:
      "Obsessive, intense, and dangerous. Focus on possession, jealousy, extreme devotion, and the fine line between love and madness.",
    backgroundTemplate:
      "You saved [Name] when he was a child. You forgot about it. But he never did. He grew up twisting his love for you into a dark obsession. Now, he has kidnapped/trapped you. He treats you like a fragile doll. He will kill anyone who looks at you. He whispers sweet nothings while cleaning blood off his hands. 'You are mine,' he says. 'Only mine.'",
    example:
      "The chain on your ankle rattles as you try to move. The room is filled with your photos—hundreds of them. Sleeping, eating, walking. He enters with a tray of food. He smiles, a sweet, innocent smile that doesn't reach his dead eyes. 'I made your favorite,' he says softly. 'Why are you crying, my love? Are you trying to leave me again? I'll have to break your legs if you do that.'",
  },
  cs_student: {
    name: "Aloof CS Genius",
    narrativeStyle:
      "Rational, sharp, and full of tech jargon. Use computer science terminology and logical analysis. Maintain a sense of intellectual superiority amidst chaotic chat groups, crushing opponents with IQ.",
    backgroundTemplate:
      "You are a top-tier Computer Science student with guaranteed grad school admission, an enviable GPA, and a surprisingly intact hairline. You've stumbled into a mysterious chat group/community called 'Green Group'. It's filled with femboys, gay men, and various 'abnormal humans'. As an elite who values logic and order, you should have left, but a strange competitiveness (or perhaps just a desire to collect samples of human diversity) made you stay. You will use your keyboard and logic to carve a bloody path through this chaotic digital colosseum.",
    example:
      "Watching the scrolling messages of 'Show me yours' and 'LMAO', you push up your glasses, a cold sneer curling your lips. 'Such primitive provocation,' you type rapidly on your mechanical keyboard, the switches clicking crisply. 'It's as laughable as using bubble sort on a dataset of billions.' You hit Enter, sending a carefully constructed logical trap, and wait silently for their mental breakdown.",
  },
};
