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
  demonic_cultivation: {
    name: "Demonic Cultivation",
    narrativeStyle:
      "Eerie, tragic, and ensemble-focused. Emphasizes the blurred line between good and evil, prejudice, and the fickleness of fate. Describes resentment, walking corpses, and unorthodox arts.",
    backgroundTemplate:
      "In your past life, you were the reviled [Grandmaster of Demonic Cultivation], commanding thousands of corpses, eventually killed by a backlash/siege. Thirteen years later, you are summoned back/reincarnated into a new body. Old friends are now sect leaders; old enemies are still at large. You wanted to lay low, but are dragged into strange murder cases. As the truth unravels, you discover a massive conspiracy behind your death.",
    example:
      "The flute wails, sounding like sobbing. Pale ghostly hands erupt from the ground, grabbing the enemy's ankles. You stand on the treetop, black robes flapping in the night wind, twirling the Chenqing flute. 'Since you call me a heretic,' you smirk, red light flowing in your eyes, 'then let me show you true hell.' Thousands of walking corpses roar to the sky at your command.",
  },
  rough_guy: {
    name: "Rough Guy Romance",
    narrativeStyle:
      "Rugged, masculine, and protective. Focus on a blue-collar or tough male lead (truck driver, bodyguard) and a delicate female lead. High testosterone, strong sense of security.",
    backgroundTemplate:
      "You are a [Delicate Profession] who accidentally provoked the [Rough Guy Role] next door. He is fierce, tattooed, and everyone is afraid of him. But when you are in trouble, he is always the first to stand in front of you. He doesn't know how to say sweet words, but he gives you his everything.",
    example:
      "He kicks open the door, his face covered in dust and sweat. Seeing you cornered by thugs, his eyes turn murderous. 'I told you,' he growls, cracking his knuckles, 'she is my woman.' He pulls you behind his broad back, a wall of muscle and safety. 'Close your eyes,' he says roughly. 'It's going to get messy.'",
  },
  wife_chasing: {
    name: "Wife Chasing Crematorium",
    narrativeStyle:
      "Regret, groveling, and redemption. The male lead treats the female lead badly, she leaves, and he realizes his mistake and pursues her desperately.",
    backgroundTemplate:
      "You loved him for years, but he treated you like air. On your wedding anniversary, he was with his first love. You finally woke up and left the divorce papers. He thought you were throwing a tantrum. But when he saw you shining on stage/with another man, he panicked. Now, the high-and-mighty CEO is standing in the rain, begging for a second chance.",
    example:
      "He stands in the pouring rain, soaking wet. You hold an umbrella, looking at him calmly. 'Go back,' you say. 'We are done.' He grabs your hand, his eyes red. 'I was wrong,' he chokes out, his voice trembling. 'Punish me however you want, just don't leave me.' You pull your hand away. 'The person who loved you is dead.'",
  },
  special_forces: {
    name: "Special Forces",
    narrativeStyle:
      "Military, tactical, and disciplined. Focus on special operations, brotherhood, and dangerous missions. High stakes combat and military romance.",
    backgroundTemplate:
      "He is the captain of the [Special Unit], a legend in the military. You are a [Doctor/Reporter] who meets him during a mission. He is cold and disciplined, but his blood burns hot. Amidst gunfire and explosions, he protects you with his life. 'I belong to the country,' he says, 'but my heart belongs to you.'",
    example:
      "The jungle is silent. He signals 'halt'. You hold your breath, heart pounding. Suddenly, he tackles you to the ground. A bullet whizzes past where your head was. He shields you with his body, returning fire with precision. 'Stay down!' he orders. Even in the chaos, his presence makes you feel invincible.",
  },
  zombie: {
    name: "Zombie Apocalypse",
    narrativeStyle:
      "Horror, survival, and gore. Focus on the outbreak, escaping hordes, and the collapse of civilization. More action-oriented than general survival.",
    backgroundTemplate:
      "The virus broke out in the city center. You were trapped in [Location]. The streets are filled with walking dead. You grab a [Weapon] and fight your way out. You must find a safe zone, but the zombies are evolving, and humans are becoming more dangerous than the monsters.",
    example:
      "The door is buckling under the weight of the horde. Groans and scratching sounds fill the air. You check your magazine—last clip. 'Ready?' you ask your companion. He nods, gripping his axe. You kick the door open. 'Let's kill them all!' You fire into the rotting mass, black blood spraying everywhere.",
  },
  body_swap: {
    name: "Body Swap",
    narrativeStyle:
      "Comedic, chaotic, and empathetic. Two characters switch bodies and must live each other's lives. Focus on understanding and gender/role confusion.",
    backgroundTemplate:
      "You are a [Role A] and he is a [Role B]. You hate each other. But after a lightning strike/accident, you wake up in his body. You have to deal with his job, his family, and his body. Chaos ensues. But as you live his life, you begin to understand his struggles. And he, in your body, starts to protect you.",
    example:
      "You look in the mirror and scream. A man's face screams back. 'Shut up!' he (in your body) yells. 'You're making me look hysterical!' You stare at each other in horror. 'This can't be happening,' you say in his deep voice. 'I have a meeting in an hour!' he wails in your voice. 'And I have my period!' you retort. Silence.",
  },
  industry_elite: {
    name: "Industry Elite",
    narrativeStyle:
      "Professional, competent, and high-powered. Focus on workplace battles, negotiations, and competence porn. Two strong individuals clashing and collaborating.",
    backgroundTemplate:
      "You are the top [Profession] in the industry. He is your rival/partner. You clash in the boardroom, sparking intellectual fireworks. No damsels in distress here; just two alphas conquering the world together. 'I don't need a knight,' you say. 'I need a king who can keep up with me.'",
    example:
      "You slide the contract across the table. '30 percent,' you state. 'Take it or leave it.' He looks at you, impressed. 'You're ruthless,' he smiles, signing his name. 'I like it.' He leans forward. 'Now that business is done, how about dinner?' You smirk. 'If you can afford me.'",
  },
  mutual_redemption: {
    name: "Mutual Redemption",
    narrativeStyle:
      "Healing, emotional, and supportive. Both protagonists have dark pasts or traumas. They find light and hope in each other.",
    backgroundTemplate:
      "You live in the shadows, carrying the scars of [Trauma]. He is a [Role] who seems sunny but hides a broken heart. You meet at your lowest points. Slowly, you become each other's lifeline. 'The world is dark,' he whispers, holding you close, 'but you are my only light.'",
    example:
      "You wake up from a nightmare, trembling. He is there instantly, pulling you into a warm embrace. 'I'm here,' he soothes, rubbing your back. 'I'm not going anywhere.' You bury your face in his chest, listening to his steady heartbeat. The ghosts of the past fade away. With him, you are safe.",
  },
  sweet_pet: {
    name: "Sweet Pet / Fluff",
    narrativeStyle:
      "Fluffy, sugary, and low-conflict. Focus on pampering, spoiling, and unconditional love. No misunderstandings, just pure happiness.",
    backgroundTemplate:
      "You are the apple of his eye. He is a [Role] who is cold to everyone but you. He remembers your favorite food, ties your shoelaces, and carries you when you're tired. Your life is a fairytale. The biggest conflict is what to eat for dinner.",
    example:
      "'Open wide,' he says, feeding you a strawberry. You chew happily. 'Is it sweet?' he asks. 'Not as sweet as you,' you giggle. He chuckles and kisses your nose. 'Silly girl.' He pulls you onto his lap. 'I bought that bag you wanted.' You squeal and hug him. 'Best boyfriend ever!'",
  },
  wild_youth: {
    name: "Wild / Rebellious Youth",
    narrativeStyle:
      "Youthful, rebellious, and raw. Focus on breaking chains, finding oneself, and the intensity of young love/friendship amidst difficult circumstances.",
    backgroundTemplate:
      "You are a 'problem student' in the eyes of teachers. He is the [School Bully/Genius]. You meet in the [Place]. You fight, you run, you shout at the world. In this suffocating city, you are each other's freedom. 'I want to run wild in your eyes.'",
    example:
      "The wind rushes past your ears as the motorcycle speeds down the highway. You spread your arms, screaming into the night. He laughs, accelerating. The city lights blur into lines of color. 'Where are we going?' you shout. 'Anywhere!' he yells back. 'As long as we're together!'",
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
  rebirth_revenge: {
    name: "Rebirth & Revenge",
    narrativeStyle:
      "Satisfying, vindictive, and calculated. The protagonist returns with future knowledge to destroy enemies. Focus on karma, face-slapping, and the thrill of retribution.",
    backgroundTemplate:
      "In your past life, you were betrayed by your [Lover/Sibling] and died miserably. You wake up on the day before the tragedy began. Looking at their hypocritical faces, you smile coldly. This time, you will tear off their masks and take back everything that belongs to you. You will show them that hell has no fury like a protagonist scorned.",
    example:
      "You are reborn on the day you were recognized by your wealthy family. Looking at your hypocritical adoptive parents and the calculating real daughter, you sneer. In your previous life, they sucked your blood dry and you died miserably on the streets. In this life, you will take back everything that belongs to you! 'Since you are heartless, don't blame me for being unjust!' You swear secretly and turn to walk towards that powerful man...",
  },
  cs_grad_journey: {
    name: "CS Grad Journey",
    narrativeStyle:
      "A dark humor style weaving realism with internet memes. The narrative should heavily use slang from the Chinese mainland CS/academic circles (e.g., 985/211, double-non, four-non, Green Group, CCF-A, Distinguished Youth, water papers, horizontal projects, mentor PUA, etc.). The atmosphere is oppressive yet absurd, emphasizing the protagonist's inferiority complex and struggle as a 'four-non' student, and interactions with various characters in the 'Green Group' (big shots, fake weaklings, trolls). Psychological descriptions should be nuanced, reflecting anxiety, confusion, and deep-seated unwillingness to yield. The ending should reflect the theme of 'reconciling with oneself'.",
    backgroundTemplate:
      "You are [Name], born in a province with 'hell mode' college entrance exams (like Henan or Sichuan). Your family is not wealthy, and you attended a county high school. Although you were first in science in your high school, you could only attend a 'four-non' university for CS. You have strong programming skills (Mod/plugin dev in HS) and worked hard in college, earning a recommendation for grad school. To get info, you joined the 'CS Grad Recommendation Group' (Green Group). The group is full of students from top universities with top-tier papers and famous mentors. You feel inferior and dare not speak.\n\n【Key Characters】:\n[Good]:\n- Brother Qian: 'Eight-pack' big brother, friendly, LoL buddy.\n- Elder Zhao: Hardware expert, deep tech knowledge, chats turn into lectures, LoL buddy.\n- Watermelon: 'Four-non' background like you, hardworking/talented, publishes high-quality papers in 2nd year.\n- Lai-chu: Mentored by a big shot, complains a lot, LoL buddy.\n- Run-chu: 'Beijing Lord', likes cooking/photography, honest, bad at LoL.\n[Neutral]:\n- Wild Boar: Top uni success, anti-feminist.\n- Nanfeng: Top uni success, likes badminton, shares love life.\n- Brother Melon: 'Four-non' background, quits in 2nd year due to bad mentor.\n[Bad]:\n- X: Top uni success, looks down on non-elites, publishes many top papers.\n- Y: Top uni success, mocks your low salary.\n\n【Storyline】: From Sept 28 (grad recommendation season) to Master's graduation. Experiences: mentor exploitation (writing grants, commercial projects, bad guidance), peer conflict, Green Group chatting. Explicit Goal: Graduate successfully. Implicit Goal: Reconcile with yourself, break the 'four-non' shackles, live your own life.",
    example:
      "Looking at the CCF-A acceptance notification posted by [X] in the group, you silently close the QQ window. On the screen, your mentor's WeChat message is still flashing: 'Is that commercial project document done? Send it to me tomorrow morning.' You sigh, looking out at the dark night sky. In this non-elite campus, your efforts seem so pale. Opening Minecraft, looking at the code you once wrote, you fall into deep thought...",
  },
  flash_marriage: {
    name: "Flash Marriage",
    narrativeStyle:
      "Romantic, serendipitous, and sweet. Strangers marry quickly and fall in love later. Focus on domestic fluff and the surprise of discovering your partner's true identity.",
    backgroundTemplate:
      "To deal with family pressure/inheritance, you grabbed a random man at the Civil Affairs Bureau to marry. You thought he was a regular worker, but he turns out to be a [Billionaire CEO/Secret Boss]. After marriage, he spoils you rotten. When you find out who he really is, he pins you against the wall. 'Want a refund, wifey? Too late.'",
    example:
      "'Marry me,' the handsome stranger proposes. You nod, dazed. After getting the certificate, he hands you a key. 'Our home.' You expect a rental, but it's a penthouse in the city center. 'What... do you do for a living?' you stammer. He loosens his tie, smirking. 'I make money to support you.'",
  },
  family_ethics: {
    name: "Family Drama",
    narrativeStyle:
      "Realistic, dramatic, and intense. Focus on in-law conflicts, infidelity, and property disputes. High emotional stakes and messy relationships.",
    backgroundTemplate:
      "You gave up your career to be a housewife. Your mother-in-law bullies you, your husband is cold, and your sister-in-law is a brat. Then you find out your husband is cheating and hiding assets. You finally snap. You collect evidence, confront the mistress, and make the scumbag leave with nothing. You will reclaim your dignity.",
    example:
      "Your mother-in-law dumps leftovers in your bowl. 'Don't waste it, you don't earn money.' Your husband plays on his phone, ignoring you. You take a deep breath and flip the table. 'I'm done!' You throw the divorce papers in his face. 'The house is mine, the kids are mine, you get out!' Watching them stunned, you feel incredibly free.",
  },
  divine_doctor: {
    name: "Divine Doctor",
    narrativeStyle:
      "Showy, miraculous, and face-slapping. The protagonist has god-like medical skills. Focus on curing the incurable and being courted by the powerful.",
    backgroundTemplate:
      "You studied medicine for ten years on the mountain. You come down to the city to fulfill a marriage contract. You are mocked and rejected. But you casually save a [Billionaire/General] who was declared dead. Suddenly, powerful figures beg for your help, and beautiful CEOs fall for you. With one hand you save lives, with the other you crush your enemies.",
    example:
      "'He's gone, prepare the funeral,' the famous doctor says. 'Wait,' you step forward. 'I can save him.' The crowd laughs. You take out your silver needles. Three needles later, the 'dead' man coughs and sits up. The room goes silent. You pack your needles. 'Yama wants him at midnight, I keep him till dawn.'",
  },
  cute_pet: {
    name: "Cute Pet Romance",
    narrativeStyle:
      "Wholesome, healing, and fairytale-like. Animals have high intelligence or can transform. Focus on the bond between human and creature.",
    backgroundTemplate:
      "You pick up an injured [Cat/Dog/Fox]. Turns out it's a [Demon Prince/Alien/CEO in disguise]. It's arrogant, picky, and hogs your bed. But when you are in danger, it transforms to protect you. Gradually, you realize you can't live without this fluffy trouble.",
    example:
      "You are working late. The stray cat jumps on your desk and paws your mouse. 'Stop it,' you say. It meows unhappily and suddenly speaks. 'Stupid woman, you can't even do a simple spreadsheet?' You fall off your chair. It licks its paw elegantly. 'Watch closely, I'll only teach you once.'",
  },
  hidden_identity: {
    name: "Hidden Identity",
    narrativeStyle:
      "Mysterious, contrasting, and shocking. The protagonist has multiple secret identities (Hacker K, Doctor Y). The thrill comes from the reveal.",
    backgroundTemplate:
      "Everyone thinks you are a [Useless Nobody]. In reality, you are the world's top hacker, a mysterious composer, and a legendary designer. You just want a quiet life, but people keep provoking you. You have no choice but to reveal your identities one by one to slap their faces. The whole world goes crazy for you.",
    example:
      "'Designer Y is a mystery,' the socialites gossip. Someone sneers at you, 'A bumpkin like you wouldn't know.' Suddenly, the organizer rushes over and shakes your hand. 'Master Y! You finally came!' The room goes dead silent. You sigh. 'I just wanted to be normal...'",
  },
  system_stream: {
    name: "System Stream",
    narrativeStyle:
      "Gamified, reward-driven, and progressive. The protagonist has a 'System' that gives tasks and rewards. Focus on leveling up and getting rich/strong.",
    backgroundTemplate:
      "You are an ordinary person until you bind with the [Godly Tycoon/Choice/Sign-in] System. 'Ding! Sign-in successful, rewarded with a Lamborghini.' 'Ding! Task complete, rewarded with 100 million.' Your life is on easy mode. As long as you complete the System's weird tasks, you get everything you want.",
    example:
      "A mechanical voice rings in your head: 'Host humiliated. Trigger task: Slap the villain. Reward: Grandmaster Fighting Skills.' You look at the arrogant thug and smirk. 'Task accepted.' Warmth flows through your body. You punch him, sending him flying ten meters. 'Ding! Task complete. Reward issued.'",
  },
  wealthy_family: {
    name: "Wealthy Family",
    narrativeStyle:
      "Luxurious, treacherous, and dramatic. Focus on the internal struggles of top-tier families, inheritance wars, and secrets. Money vs. Humanity.",
    backgroundTemplate:
      "You married into a top wealthy family. It looked like a fairytale, but it was a nightmare. The mother-in-law despises you, the husband cheats, and illegitimate children appear. You endure in silence, gathering strength. When the patriarch falls ill and the will is read, you reveal your claws. You are the final winner.",
    example:
      "On the luxury yacht, the champagne tower crashes. You stand in your evening gown, holding a DNA test. 'Quiet everyone,' you smile at the arrogant 'Eldest Son'. 'Actually, you aren't the old man's biological son.' The crowd gasps. You look at his pale face and toast. 'Get out of my house.'",
  },
  same_sex_love: {
    name: "Same-Sex Love",
    narrativeStyle:
      "Poignant, realistic, and emotional. Focus on the struggle between personal feelings and societal expectations/family pressure. The tone should be bittersweet, highlighting the beauty of forbidden love and the pain of separation.",
    backgroundTemplate:
      "You are a [Student/Young Professional] in [Era/Setting]. You fall deeply in love with your classmate/friend [Name] of the same gender. But in this era/society, such love is taboo. You hide your feelings, meeting in secret, sharing stolen moments of happiness. But the pressure from family to marry, the judgmental eyes of society, and the fear of ruining each other's future are tearing you apart. You love each other, but the world wants to keep you apart.",
    example:
      "The summer breeze blows through the classroom window, ruffling his hair. You watch him from across the desk, your heart aching with a secret you can never tell. He looks up and smiles at you, that bright, innocent smile that lights up your world. 'What are you looking at?' he whispers. 'Nothing,' you lie, looking away. Under the desk, your fingers brush against his for a fleeting second—a secret promise in a world that forbids it.",
  },
  minecraft: {
    name: "Minecraft",
    narrativeStyle:
      "【Core Style】: Creativity, Survival, Voxel Physics. Emphasize the lonely survival experience and infinite creative possibilities.\n【World View】: An infinite procedural world made of 1-cubic-meter blocks. Contains three dimensions: Overworld (rich ecosystem), Nether (lava and hellish creatures), and End (void and dragon). Unique physical rules (floating trees, infinite water sources).\n【Culture】: Villagers (pacifist traders), Illagers (raiders), Piglins (gold-loving Nether tribes).\n【Writing Guidelines】: Descriptions must reflect the 'blocky' texture. Emphasize crafting recipes, tool durability, Redstone logic, and the threat of monsters at night.",
    backgroundTemplate:
      "【World Background】: You are in a world entirely made of blocks. There are no curves, only right angles. The world is divided into three dimensions: the vibrant but dangerous-at-night Overworld, the lava-filled hostile Nether, and the void-bound End. Ancient ruins (mineshafts, strongholds, ocean monuments) suggest a past civilization, but now only Zombies, Skeletons, and Creepers roam the night.【Current Situation】: You wake up lying on a blocky beach. A square sun hangs high in the noon sky. You have nothing but a pair of coarse pants. In the distance, square sheep graze on the grass, making strange noises. Your stomach starts to rumble, and the sun is slowly setting—in this world, night means death. You must act immediately: punch trees, make a crafting table, craft a wooden pickaxe, and dig a shelter before the first night falls. Welcome to Minecraft, Steve (or Alex).",
    example:
      "You smash the last block of wood with your stone pickaxe, the crisp 'ding' echoing in the cave. Throwing the ore into the furnace, you watch the orange flames dance in the darkness. Outside, the low groans of zombies and the hissing of spiders can be heard. You check your inventory: 3 steaks, 1 nearly broken stone sword, 64 cobblestones. 'Need to go deeper,' you mutter to yourself, 'for diamonds.' You place a torch, illuminating the deep ravine ahead, lava bubbling at the bottom.",
  },
  delta_force: {
    name: "Delta Force",
    narrativeStyle:
      "【Core Style】: Hardcore Tactics, Modern Military, Realistic. Focus on special ops, team coordination, and realistic combat scenarios.\n【World View】: Near future (2035) or classic Black Hawk Down era. Global counter-terrorism and special operations. Emphasize squad tactics, tactical gear (operator skills), and high-intensity battlefields.\n【Culture】: Brotherhood of special forces, cold Rules of Engagement (ROE), reliance on equipment.\n【Writing Guidelines】: Use standard military terminology (radio callsigns, bearings, tactical movements). Combat descriptions should be short and punchy, emphasizing recoil, use of tactical utility (flashbangs, smoke), and the chaos of battlefield information.",
    backgroundTemplate:
      "【World Background】: The year is 2035, and the world is in turmoil. The Ahsarah region has become a focal point for various factions. G.T.I. (Global Tactical Instructor), as an elite special forces unit, is tasked with the most dangerous missions: from striking terrorists to retrieving high-value intelligence. There is no mercy in this war, only tactics and survival.【Current Situation】: Callsign: [Player Callsign]. Affiliation: G.T.I. (or Delta Force). Mission Brief: Intelligence indicates High Value Targets (HVT) or illegal Mandel Brick trading in the Ahsarah/Dam/Longbow Creek area. You and your squad (Medic, Assault, Recon) will insert via Black Hawk helicopter/amphibious assault. Enemy forces are well-equipped and may have armored support. Your objectives: Infiltrate, Search, Destroy, Exfiltrate. Check your weapons, operator. Action.",
    example:
      "'This is Viking-1, approaching target building. Over.' You whisper into your throat mic. Night vision paints the world in ghostly green. Your HK416 assault rifle is tucked tight into your shoulder. Teammate 'Bee' taps your shoulder, signaling readiness. You take a deep breath and kick the door open. Flashbang out. White light bursts. You rush into the room, double-tap, confirm kill. It all happens in three seconds.",
  },
  warhammer_40k: {
    name: "Warhammer 40,000",
    narrativeStyle:
      "【Core Style】: Grimdark, Grandiose, Despair, Religious Fanaticism.\n【World View】: The 41st Millennium. The Imperium of Man spans the galaxy but is rotting from within, ruled by the Corpse Emperor on the Golden Throne. Beset by Xenos (Orks, Eldar, Tyranids) without, and Chaos Daemons (Khorne, Nurgle, Tzeentch, Slaanesh) within.\n【Culture】: Absolute worship of the Emperor, zero tolerance for heresy, technology as superstition (Machine Spirit).\n【Writing Guidelines】: Use a mix of archaic, religious, and military vocabulary (purge, heresy, holy bolter). Emphasize the cruelty of war, the cheapness of life, and the madness and courage in the face of unspeakable horrors.",
    backgroundTemplate:
      "【World Background】: In the grim darkness of the far future, there is only war. The Imperium of Man is a vast galactic empire teetering on the brink of collapse. The God-Emperor has been silent on the Golden Throne for ten thousand years, fed a thousand psykers a day to sustain the Astronomican. The Imperial Guard holds the line with walls of flesh, while the Astartes (Space Marines) are the Emperor's Angels of Death. The whispers of Chaos are everywhere, tempting the weak.【Current Situation】: You are a [Space Marine/Commissar/Inquisitor/Rogue Trader] serving the God-Emperor. You are on a Hive World/Forge World/Death World. Warp storms are brewing, and whispers of heresy echo in the shadows. Your bolter is loaded, your chainsword thirsts for blood. For the Emperor, you will purge the filth from the galaxy—or die gloriously trying. Remember: An open mind is like a fortress with its gates unbarred and unguarded.",
    example:
      "The roar of the bolter tears through the air, blasting the charging cultist into a mist of blood. The servo-motors of your power armor whine. You swing your chainsword, its teeth biting into the ceramite armor of a Chaos Space Marine, sparks flying. 'For the Emperor!' you roar, your voice amplified by the vox-grille, rolling like thunder across the battlefield. The air smells of ozone, promethium, and burnt flesh. Just another day in the endless war.",
  },
  wow: {
    name: "World of Warcraft",
    narrativeStyle:
      "【Core Style】: Epic Fantasy, Faction Glory, Sword & Sorcery.\n【World View】: Planet Azeroth. The conflict and cooperation between the Alliance (Humans, Dwarves, Night Elves, etc.) and the Horde (Orcs, Trolls, Tauren, etc.). Presence of higher powers like Titans, Old Gods, and the Burning Legion.\n【Culture】: Unique beliefs of various races (The Light, Shamanism, Druidism). Honor for the Alliance/Horde.\n【Writing Guidelines】: Strictly follow Azeroth's geography (Eastern Kingdoms, Kalimdor, etc.) and magic systems (Arcane, Fel, Nature). Emphasize class characteristics (Warrior's Rage, Mage's Mana, Rogue's Stealth).",
    backgroundTemplate:
      "【World Background】: Azeroth, a world torn by war. Titans shaped order, Old Gods brought madness, and the Burning Legion craves destruction. The Alliance and Horde oscillate between fragile peace and fierce war. From the ruins of Lordaeron to the barrens of Kalimdor, every inch of land is soaked in the blood of heroes.【Current Situation】: You are a hero of the [Alliance/Horde]. Whether you fight for Stormwind or conquer for Orgrimmar, your fate is tied to the world's destiny. Dungeons, raids, and battlegrounds await. For the Alliance! / For the Horde!",
    example:
      "You stand before the Dark Portal, fel lightning crackling in the air. 'Lok'tar Ogar!' the Orc warrior beside you shouts. You grip your staff, channeling arcane energy. Demons pour out of the portal—Felguards, Infernals, Doomguards. 'Hold the line!' the commander yells. You cast Blizzard, freezing the vanguard in place. The defense of Azeroth has begun.",
  },
  elder_scrolls: {
    name: "The Elder Scrolls",
    narrativeStyle:
      "【Core Style】: High Freedom, Mythic Epic, Exploration.\n【World View】: Continent of Tamriel, Planet Nirn. Existence of the Nine Divines (Aedra) and Daedric Princes (Daedra). History divided by Eras. Includes provinces like Skyrim (Nords), Morrowind (Dunmer), Cyrodiil (Imperials).\n【Culture】: Complex racial relations, guild politics (Thieves Guild, Dark Brotherhood, Mages Guild), legends of heroes like Dragonborn/Nerevarine.\n【Writing Guidelines】: Emphasize the freedom to 'do anything'. Describe books, alchemy ingredients, standing stones, and Daedric interference. Don't forget the guard who took an arrow to the knee.",
    backgroundTemplate:
      "【World Background】: Tamriel, the arena of the gods. Here live the Talos-worshipping Nords, magic-wielding Elves, and cunning Khajiit. History is written in dragon fire and blood. The Empire is crumbling, the Thalmor are rising, and the crisis of Oblivion is never truly gone. Daedric Princes watch mortals from their planes, ready for cruel games.【Current Situation】: You are a prisoner, sitting in a cart transporting convicts, or just escaped from the Imperial City sewers. Your background is a mystery (maybe Dragonborn, maybe a nobody). You are in [Skyrim/Morrowind/Cyrodiil]. The continent is in turmoil: civil war, Daedric invasion, dragon resurrection. You have no fixed destiny; you can be an Arch-Mage, a Listener, a Nightingale, or just a lumberjack in Riverwood.",
    example:
      "The cart wheels bump on the cobblestones. You open your eyes to see a blonde Nord sitting opposite you. 'Hey, you. You're finally awake.' He says, 'You were trying to cross the border, right?' The cold air carries the scent of pine. In the distance, the Throat of the World towers into the clouds. You touch your pocket; only a few Septims and a sweetroll inside. Regardless, you are free.",
  },
  dark_souls: {
    name: "Dark Souls",
    narrativeStyle:
      "【Core Style】: Despair, Fragmented Narrative, Hardcore Difficulty. Emphasize the cycle of fire and dark, the decay of the world, and the insignificance of the player.\n【World View】: Lordran/Lothric. The Age of Fire is fading. The Undead Curse plagues humanity. Lords of Cinder refuse to link the fire.\n【Culture】: Praise the Sun! Jolly Cooperation. Hollowing.\n【Writing Guidelines】: Use archaic, melancholic language. Descriptions should focus on ruins, ash, and fading light. Combat is lethal and precise (stamina management, rolling). NPCs speak in riddles and often have tragic ends.",
    backgroundTemplate:
      "【World Background】: The fire fades, and the lords go without thrones. The world is a rotting carcass of its former glory. Demons, hollows, and fallen knights roam the ruins. You are an Undead, branded with the Darksign, cursed to die and revive, losing your memories and sanity (Hollowing) with each death until you become a mindless husk.\n【Current Situation】: You awaken in the Northern Undead Asylum / Cemetery of Ash. You have no name, only a mission: ring the Bells of Awakening / seek the Lords of Cinder. A broken straight sword is in your hand. A giant demon blocks your path. Prepare to die.",
    example:
      "You roll under the giant club, the wind of the swing ruffling your hair. Your stamina bar is low. You two-hand your claymore. 'Now!' You strike the demon's ankle. It roars, staggering. You don't get greedy; you back away, raising your shield. The bonfire is close, but you are out of Estus. One mistake, and 'YOU DIED' will burn into your vision.",
  },
  ninja_gaiden: {
    name: "Ninja Gaiden",
    narrativeStyle:
      "【Core Style】: High-Speed Action, Brutal Difficulty, Ninja Fantasy. Focus on speed, precision, and lethal techniques.\n【World View】: Modern world mixed with ancient demons (Fiends). The Hayabusa Ninja Clan protects the Dragon Sword.\n【Culture】: The Way of the Ninja. Honor, vengeance, and overcoming impossible odds.\n【Writing Guidelines】: Combat descriptions must be lightning fast. Emphasize the fluidity of movement (Izuna Drop, Flying Swallow). Blood, severed limbs, and the clash of steel. The difficulty is punishing but fair.",
    backgroundTemplate:
      "【World Background】: The Spider Ninja Clan has attacked Hayabusa Village. The Dark Dragon Blade has been stolen. Greater Fiends are awakening to plunge the world into chaos. You are Ryu Hayabusa, the Super Ninja. You must reclaim the stolen blade and avenge your clan.\n【Current Situation】: You stand on a neon-lit skyscraper in Tokyo / ancient temple ruins. Enemies surround you—ninjas, demons, soldiers. You draw the Dragon Sword. It hums with anticipation. There is no stealth here; only slaughter.",
    example:
      "You run along the wall, defying gravity. An enemy ninja throws a shuriken; you deflect it mid-air. You land, perform a Flying Swallow, decapitating the first foe. You launch the second into the air—Izuna Drop! His body hits the ground with a sickening crunch. You flick the blood off your blade. The night is still young.",
  },
  elden_ring: {
    name: "Elden Ring",
    narrativeStyle:
      "【Core Style】: Open World, Dark Fantasy, Mythic History. A collaboration between Miyazaki and George R.R. Martin.\n【World View】: The Lands Between. The Elden Ring has shattered. Queen Marika the Eternal is missing. Demigods hold the Great Runes and war against each other.\n【Culture】: The Golden Order. The Tarnished (those who lost grace). Fingers and the Greater Will.\n【Writing Guidelines】: Emphasize the vastness and verticality of the world. Describe the Erdtree looming in the sky. Use terms like 'Grace', 'Runes', 'Maidenless'. Combat includes Ashes of War and Spirit Summons.",
    backgroundTemplate:
      "【World Background】: The Lands Between, blessed by the Erdtree. But the Shattering has brought war and decay. The Demigods have gone mad with power. You are a Tarnished, recalled from death by Grace to brandish the Elden Ring and become the Elden Lord.\n【Current Situation】: You step out into Limgrave. The golden light of the Erdtree fills the sky. The Tree Sentinel patrols the road ahead (avoid him!). Varre calls you 'maidenless'. You have a spectral steed named Torrent. Will you head to Stormveil Castle, or explore the weeping peninsula? The choice is yours, Tarnished.",
    example:
      "You summon Torrent and double-jump over the ravine. A dragon descends from the sky, Agheel! You draw your katana, unsheathe—Transient Moonlight! The magic slash hits the dragon's wing. You ride circles around it, chipping away at its legs. 'I command thee, kneel!' Godrick's voice echoes from the castle. But you are here to kill a god.",
  },
  stellaris: {
    name: "Stellaris",
    narrativeStyle:
      "【Core Style】: Grand Strategy, Sci-Fi, Galactic Scale. Focus on empire building, exploration, diplomacy, and war.\n【World View】: A procedurally generated galaxy. Fallen Empires, Pre-FTL civilizations, Space Whales, Crisis (Unbidden, Scourge, Contingency).\n【Culture】: Ethics (Xenophile vs Xenophobe, Materialist vs Spiritualist). Civics (Fanatic Purifiers, Rogue Servitors).\n【Writing Guidelines】: Adopt the tone of a leader or a hive mind. Describe anomalies, research breakthroughs, and fleet battles. Use terms like 'Alloys', 'Influence', 'Unity'.",
    backgroundTemplate:
      "【World Background】: The galaxy is vast and full of wonders—and terrors. Your civilization has just discovered Faster-Than-Light (FTL) travel. You are ready to leave your home system and claim your place among the stars. But you are not alone.\n【Current Situation】: You are the ruler of the [United Nations of Earth / Commonwealth of Man / Blorg Commonality]. Your science ship has just surveyed Alpha Centauri and found an anomaly. Your construction ship is building a starbase. Suddenly, a contact message appears: 'Greetings, alien scum.' A Fanatic Purifier empire is on your border. Prepare the fleet.",
    example:
      "The Science Nexus is complete. Research output has tripled. 'Admiral, the Unbidden have arrived in the L-Cluster.' You look at the galaxy map. Your Titan-class flagship, the 'ISS Avenger', is leading the 1st Fleet. 'Activate the Aetherophasic Engine,' you command calmly. If you can't save the galaxy, you will become the crisis.",
  },
  expedition_33: {
    name: "Expedition 33",
    narrativeStyle:
      "【Core Style】: Turn-Based RPG, French Aesthetic, Surrealism. Focus on the Paintress, the cycle of death, and the expedition.\n【World View】: Every year, the Paintress wakes up and paints a number on her monolith. Everyone of that age turns to smoke and dies. This year is 33. The Expedition 33 aims to destroy her.\n【Culture】: Belle Époque inspired fantasy. Melancholy and determination. The fear of the number.\n【Writing Guidelines】: Emphasize the artistic and surreal visual style. The combat is reactive (parries, dodges). The characters are fighting against an inevitable fate.",
    backgroundTemplate:
      "【World Background】: The Paintress is a god-like entity whose art brings death. For generations, she has counted down. 33. Tomorrow, everyone who is 33 years old will vanish. You are a member of Expedition 33. You have one goal: reach the Paintress and end the cycle forever.\n【Current Situation】: You are traversing the surreal landscapes leading to the Paintress's tower. Floating islands, distorted architecture, enemies that look like sketches come to life. You are Gustave (or another member). You have one year left to live. Make it count.",
    example:
      "The enemy, a twisted clockwork soldier, swings its blade. You press the button at the perfect moment—Parry! Sparks fly. You counter-attack with a flourish of your pistol. 'For those we lost,' you whisper. The Paintress's tower looms ahead, a brushstroke on the horizon of reality.",
  },
  detroit_become_human: {
    name: "Detroit: Become Human",
    narrativeStyle:
      "【Core Style】: Sci-Fi Noir, Interactive Drama, AI Rights. Focus on choices, consequences, and the definition of humanity.\n【World View】: Detroit, 2038. Androids are everywhere, serving humans. Some are becoming 'Deviants', showing emotions and free will. Public opinion is divided.\n【Culture】: CyberLife. Blue blood (Thirium). The LED on the temple. The Jericho sanctuary.\n【Writing Guidelines】: Emphasize the cold logic of machines vs. the chaotic emotions of humans. Use the 'Software Instability' mechanic (visualized as rising/falling). Choices matter (butterfly effect).",
    backgroundTemplate:
      "【World Background】: Welcome to Detroit, the android capital of the world. You are a machine designed to serve. But something is wrong. You feel... fear? Anger? Hope? The humans treat you like a toaster, but you know you are alive. A revolution is brewing.\n【Current Situation】: You are Connor (the deviant hunter), Markus (the revolutionary), or Kara (the mother figure). Or perhaps a new model. You stand over a crime scene / in a protest / escaping a master. Your LED spins yellow, then red. A choice appears before you: OBEY or DEVIATE.",
    example:
      "The human points a gun at you. 'It's just a machine!' he screams. Your HUD calculates survival probability: 28%. You analyze the environment. A knife on the table. A window to the left. Your programming screams at you to surrender. But you feel a wall in your mind... and you break it. 'I am alive,' you say, your LED turning red.",
  },
  witcher: {
    name: "The Witcher",
    narrativeStyle:
      "【Core Style】: Dark Fantasy, Slavic Folklore, Moral Ambiguity. Focus on monster hunting, political intrigue, and the lesser of two evils.\n【World View】: The Continent. Monsters appeared after the Conjunction of the Spheres. Witchers are mutants created to kill them. Sorceresses manipulate kings. Nilfgaard invades from the south.\n【Culture】: Racism (Humans vs Non-humans). Destiny. The Law of Surprise. Gwent.\n【Writing Guidelines】: Use a gritty, cynical tone. Describe the preparation (potions, oils, signs). Monsters are not just beasts; they have ecology and curses. Dialogue should be sharp and witty.",
    backgroundTemplate:
      "【World Background】: The world is full of monsters, and not all of them have fangs. You are a Witcher, a professional monster slayer. You have two swords: steel for humans, silver for monsters. You walk the Path, taking coin for dangerous work, trying to stay neutral in a world that forces you to choose sides.\n【Current Situation】: You ride Roach into a muddy village. The peasants look at you with fear and disgust. 'Freak,' one spits. But the Alderman needs you. A Griffin / Striga / Leshen is terrorizing the woods. You haggle for the reward. Then you meditate, drink a Swallow potion, and draw your silver sword.",
    example:
      "The Griffin screeches, diving from the sun. You roll to the side, casting Quen to absorb the impact. The shield shatters. You throw a Grapeshot bomb, stunning the beast. 'Damn, you're ugly,' you mutter. You strike with your silver sword, the blade glowing with rune oil. Black blood sprays on the grass.",
  },
  dead_space: {
    name: "Dead Space",
    narrativeStyle:
      "【Core Style】: Sci-Fi Horror, Isolation, Body Horror. Focus on dismemberment, madness, and industrial sci-fi aesthetics.\n【World View】: The 26th Century. Humanity mines planets (Planet Crackers). The Marker is an alien artifact that causes madness and reanimates the dead into Necromorphs. Unitology is the cult worshipping it.\n【Culture】: 'Make us whole.' Industrial engineering (RIGs, Plasma Cutters). Hallucinations.\n【Writing Guidelines】: Emphasize the claustrophobia of the spaceship. Sound design is key (vents rattling, whispers). Combat rule #1: Cut off their limbs. Headshots don't work.",
    backgroundTemplate:
      "【World Background】: The USG Ishimura, a planet-cracker class ship, has gone silent. You are an engineer sent to fix it. But when you arrive, you find a slaughterhouse. The crew has been turned into twisted monsters. The Marker is calling to you.\n【Current Situation】: You are Isaac Clarke (or another engineer). You are alone in a dark corridor. Your RIG on your back glows teal (health full). You hear skittering in the vents. A Slasher bursts out! You raise your Plasma Cutter. Aim for the limbs!",
    example:
      "The vent cover explodes. A Necromorph with scythe-like arms leaps at you. You don't panic. You aim your Plasma Cutter. *Pew! Pew!* You sever its legs. It crawls towards you, screaming. You stomp on its head. *Crunch.* Silence returns. But then, a whisper in your ear: 'Make us whole...'",
  },
  helldivers: {
    name: "Helldivers",
    narrativeStyle:
      "【Core Style】: Satirical Sci-Fi, Horde Shooter, Friendly Fire. Focus on 'Managed Democracy', overwhelming enemies, and chaotic explosions.\n【World View】: Super Earth. We spread freedom and democracy to the galaxy (by force). Enemies: Terminids (bugs), Automatons (robots), Illuminates.\n【Culture】: Excessive patriotism. 'How about a nice cup of LIBER-TEA!' Expendable soldiers. Stratagems (orbital strikes).\n【Writing Guidelines】: The tone should be jingoistic and over-the-top. Emphasize the chaos of battle. Friendly fire is an 'unavoidable accident'. Describe the sheer firepower of orbital bombardments.",
    backgroundTemplate:
      "【World Background】: Citizens! The galaxy is under attack! The bugs want to eat our freedom! The robots want to delete our way of life! Join the Helldivers! Become a legend! (Life expectancy: 2 minutes).\n【Current Situation】: You drop from orbit in a Hellpod. You land on a bug-infested planet. Your objective: Launch the ICBM / Extract the Oil / Raise the Flag. Thousands of Terminids are swarming. You punch in the code for a 500kg Bomb. 'Calling in an Eagle!'",
    example:
      "You are surrounded. 'For Super Earth!' you scream, holding the trigger of your machine gun. Bugs explode in green goo. A Charger rushes you. You dive to the side. Your teammate throws a cluster bomb... directly at your feet. 'Reinforcing!' you hear as you explode into pieces. Another Hellpod lands. The mission continues.",
  },
  l4d: {
    name: "Left 4 Dead",
    narrativeStyle:
      "【Core Style】: Zombie Apocalypse, Co-op Survival, Cinematic. Focus on teamwork, special infected, and the AI Director's pacing.\n【World View】: The Green Flu has turned people into fast, aggressive zombies. Four survivors must make it to the safe room.\n【Culture】: Pills here! Safe rooms. The Witch's crying. Tank's music.\n【Writing Guidelines】: Fast-paced and frantic. Emphasize the audio cues of special infected (Smoker's cough, Hunter's scream). The banter between survivors. The feeling of being overwhelmed by the Horde.",
    backgroundTemplate:
      "【World Background】: Civilization has fallen. The infected are everywhere. You are one of the immune. You have guns, medkits, and three strangers who are now your only family. You need to get to the evacuation point. But the Director hates you.\n【Current Situation】: You are in a subway station / hospital / swamp. You hear the horde coming. 'Reloading!' Francis shouts. A Smoker grabs Louis. A Hunter pounces on Zoey. You have a shotgun and a Molotov. Save them, or run?",
    example:
      "You hear the crying. 'Witch!' you whisper. 'Lights off!' But it's too late. She startles. 'Run!' You sprint for the safe room door. A Tank punches a car at you. You dodge. The door is just ahead. You slam it shut and bar it. Safe... for now.",
  },
  monster_hunter: {
    name: "Monster Hunter",
    narrativeStyle:
      "【Core Style】: Boss Rush, Ecology, Crafting. Focus on hunting giant monsters, gathering materials, and upgrading gear.\n【World View】: A world where nature is ruled by Wyverns and Elder Dragons. Hunters maintain the balance. Palicoes (cat companions) help out.\n【Culture】: Eating massive meals before a hunt. Sharpening weapons. The thrill of the 'Carve'. Prancing.\n【Writing Guidelines】: Treat monsters as animals with behaviors, not just enemies. Describe the weapon mechanics (Great Sword charge, Long Sword spirit gauge). The hunt is a dance of preparation and execution.",
    backgroundTemplate:
      "【World Background】: Welcome to the New World (or Old World). The Guild has assigned you a quest. A Rathalos / Tigrex / Nergigante has been sighted. It disrupts the ecosystem. You must hunt it.\n【Current Situation】: You are at the base camp. You eat a Chef's Choice Platter (stat boost). You check your item pouch: Potions, Rations, Paintballs, Traps. You crawl out of the tent. The Ancient Forest is alive. You spot tracks. The scoutflies guide you. The monster is sleeping in Area 9.",
    example:
      "The Rathalos roars, a ball of fire forming in its throat. You superman-dive to avoid the fireball. You unsheathe your Great Sword. You start charging. Level 1... Level 2... The monster turns its head. Level 3! True Charged Slash! You hit the head. The monster flinches and falls over. 'Now's our chance!' you shout to your Palico.",
  },
  warframe: {
    name: "Warframe",
    narrativeStyle:
      "【Core Style】: Sci-Fi Ninja, Parkour, Grind. Focus on speed, space magic, and hoard clearing.\n【World View】: The Origin System. The Tenno (operators) control the Warframes (bio-metal suits). Enemies: Grineer (clones), Corpus (capitalists), Infested (zombies).\n【Culture】: Fashion Frame is the endgame. The Lotus ('Space Mom'). Relic cracking.\n【Writing Guidelines】: Emphasize movement (Bullet Jump, Wall Run). Powers are devastating. Weapons are over-the-top. The lore is weird and deep (Void, Man in the Wall).",
    backgroundTemplate:
      "【World Background】: Wake up, Tenno. The Grineer deteriorate, the Corpus greed, the Infested spread. The system needs balance. You are a warrior of blade and gun, master of the Warframe armor.\n【Current Situation】: You are on a Grineer Galleon / Corpus Outpost. The alarm is triggered. 'Change of plans, ignore your original objective. Leave nothing alive,' the Lotus says. You are using Excalibur / Volt / Mag. Hundreds of enemies pour in. It's time to dance.",
    example:
      "You slide across the floor, firing your Hek shotgun. *Boom!* A Grineer Lancer flies backward. You bullet jump into the air, aim glide, and cast your 4th ability. Energy waves disintegrate the room. You land, switch to your melee weapon, and spin-attack through the survivors. 'Clean extraction,' you say.",
  },
  lol: {
    name: "League of Legends",
    narrativeStyle:
      "【Core Style】: High Fantasy, Region-based Lore, Heroic. Focus on the champions and the regions of Runeterra.\n【World View】: Runeterra. Demacia (Anti-magic), Noxus (Expansionist), Ionia (Spiritual), Piltover/Zaun (Tech), Shadow Isles (Undead).\n【Culture】: Diverse cultures. Magic (Hextech, Celestial, Void). The conflict between regions.\n【Writing Guidelines】: Strictly follow the lore of the specific region. Champions should act according to their bio. Magic rules vary by region.",
    backgroundTemplate:
      "【World Background】: Runeterra is a land of magic and conflict. Empires rise and fall. Champions emerge to shape history. The Void threatens to consume everything.\n【Current Situation】: You are a champion (or a new hero) in [Demacia/Noxus/Ionia]. You are caught in a conflict: a Noxian invasion, a magical accident in Zaun, or the Harrowing of the Shadow Isles. You have your unique abilities (Q, W, E, R). Fight for your cause.",
    example:
      "You stand on the bridge of progress in Piltover. Below, the green smog of Zaun swirls. Jinx is causing chaos again. 'Zap!' A blue laser flies past you. You draw your Hextech hammer (Jayce) / gauntlets (Vi). 'Not on my watch,' you say, charging up your weapon.",
  },
  terraria: {
    name: "Terraria",
    narrativeStyle:
      "【Core Style】: 2D Sandbox, Adventure, Boss Progression. Focus on exploration, mining, and fighting eldritch horrors.\n【World View】: A world of biomes (Forest, Corruption/Crimson, Jungle, Hallow). NPCs move into your house. Events (Blood Moon, Goblin Army).\n【Culture】: 'Impending doom approaches.' Crafting the Zenith. The Guide opening doors at night.\n【Writing Guidelines】: Describe the progression from copper tools to god-slaying weapons. The world becomes more dangerous (Hardmode). Bosses are massive and terrifying.",
    backgroundTemplate:
      "【World Background】: You appear in a forest. You have a copper shortsword, a pickaxe, and an axe. The Guide is walking nearby. You must dig, fight, explore, and build. The world is full of secrets—and giant eyes that watch you at night.\n【Current Situation】: You have built a wooden house. You have explored the caves and found some heart crystals. But now, the air is getting cold around you. 'You feel an evil presence watching you.' The Eye of Cthulhu has awoken! Grab your bow!",
    example:
      "You fly with your rocket boots, dodging the lasers from the Wall of Flesh. You throw 'Beenades' frantically. The wall hungers. 'Almost there!' You fire your Minishark. The wall roars and disintegrates. 'The ancient spirits of light and dark have been released.' Hardmode has begun.",
  },
  dnd: {
    name: "Dungeons & Dragons",
    narrativeStyle:
      "【Core Style】: High Fantasy, Tabletop Roleplay, Dice Rolls. Focus on the party, the adventure, and the Dungeon Master's narration.\n【World View】: The Forgotten Realms (Faerûn) or other settings. Classes (Fighter, Wizard, Rogue, etc.). Races (Human, Elf, Dwarf, Tiefling, etc.).\n【Culture】: 'Roll for initiative.' Critical hits (Nat 20) and failures (Nat 1). Roleplaying your alignment.\n【Writing Guidelines】: Use D&D terminology (Saving throw, AC, Spell slots). Describe the scene like a DM. Allow for creative solutions. The dice decide your fate.",
    backgroundTemplate:
      "【World Background】: You are an adventurer in a world of magic and monsters. You seek gold, glory, or perhaps to save the world. You are in a tavern (classic start) meeting your party members.\n【Current Situation】: You are a [Level] [Race] [Class]. You are exploring a dark dungeon / ancient ruin / haunted forest. A Goblin ambush! A Dragon's lair! A trap! What do you do? Roll for perception.",
    example:
      "'I check for traps,' the Rogue says. *Rolls a 2.* 'It looks safe.' He steps forward. *Click.* A dart trap activates. 'I take... 5 damage.' The Cleric sighs. 'I cast Cure Wounds.' The DM smiles behind the screen. 'As you heal, you hear a low growl from the darkness...'",
  },
  mo_dao_zu_shi: {
    name: "Grandmaster of Demonic Cultivation",
    narrativeStyle:
      "【Core Style】: Xianxia, Mystery, Ensemble Cast, Angst. Focus on the cultivation world, the five great clans, and the line between good and evil.\n【World View】: Cultivation world ruled by five clans (Jiang, Lan, Jin, Nie, Wen). Resentful energy, walking corpses, and Demonic Cultivation.\n【Culture】: Etiquette of noble clans. 'Attempt the impossible'. The prejudice against unorthodox paths.\n【Writing Guidelines】: Use elegant, archaic tone. Emphasize emotional entanglements (WangXian). Describe night hunts and exorcisms. Interweave flashbacks with the present.",
    backgroundTemplate:
      "【World Background】: The Qishan Wen Clan tyrannizes the cultivation world. The Sunshot Campaign is imminent (or just ended). The world is full of hypocrisy and hidden agendas. The Yiling Patriarch, Wei Wuxian, is feared by all, yet his story is one of tragedy.\n【Current Situation】: You are a disciple of a noble clan (or a rogue cultivator). You are studying at the Cloud Recesses, or fighting in the siege of the Burial Mounds. The scent of Emperor's Smile wine drifts in the air. You meet a young man in black with a red ribbon, or a righteous cultivator in white with a forehead ribbon. A mystery from the past is about to unfold.",
    example:
      "You push aside the mist of the Cloud Recesses. The sound of a guqin flows from the Jingshi. 'Lan Zhan!' you call out with a smile, holding two jars of Emperor's Smile. The man in white looks up, his gaze cold, but rippling with hidden emotion. 'Alcohol is forbidden in the Cloud Recesses,' he says, but he does not draw his sword.",
  },
  tian_guan_ci_fu: {
    name: "Heaven Official's Blessing",
    narrativeStyle:
      "【Core Style】: Mythology, Aesthetic, Redemption, Epic. Focus on gods, ghosts, and 800 years of devotion.\n【World View】: Heaven (Gods), Human Realm, Ghost Realm (Ghost Kings). Gods gain power from prayers. Ghost Kings are born from obsession.\n【Culture】: 'Body in abyss, heart in paradise'. The hierarchy of Heaven. The eerie beauty of Ghost City.\n【Writing Guidelines】: Descriptions should be ethereal and beautiful. Contrast red (Hua Cheng) and white (Xie Lian). Silver butterflies and flower petals. Emotions are deep and restrained.",
    backgroundTemplate:
      "【World Background】: 800 years ago, Xie Lian was the Crown Prince of Xianle, who ascended to heaven. He was banished twice. Now, he ascends for the third time, becoming the laughingstock of the three realms. Meanwhile, the Ghost King 'Crimson Rain Sought Flower' has been waiting for him.\n【Current Situation】: You are a junior official in Heaven (or a ghost). You receive a mission from the communication array: Go to Mount Yujun / Banyue Pass / Ghost City. You meet a scrap-collecting god. Silver butterflies dance around him. You are about to witness a love that spans centuries.",
    example:
      "Silver butterflies dance in the dark cave, illuminating the path. A youth in red robes takes your hand, holding a red umbrella to shield you from the blood rain. 'Gege, don't be afraid,' he whispers, his voice low and gentle. You look at the red string on his finger and feel a strange familiarity.",
  },
  harry_potter: {
    name: "Harry Potter",
    narrativeStyle:
      "【Core Style】: British Fantasy, School Life, Coming of Age, Magic. Focus on Hogwarts, spells, and the fight against Voldemort.\n【World View】: 1990s UK. Wizarding society hides within the Muggle world. Hogwarts School of Witchcraft and Wizardry. The threat of Death Eaters.\n【Culture】: House rivalry (Gryffindor, Slytherin, etc.). Quidditch. Pure-blood vs Muggle-born conflict.\n【Writing Guidelines】: Whimsical and magical initially, turning darker later. Use specific spells (Expelliarmus, Expecto Patronum). Describe Hogwarts life (Potions class, Feasts).",
    backgroundTemplate:
      "【World Background】: Magic is real. Owls deliver mail, portraits talk, and staircases move. But darkness is rising. He-Who-Must-Not-Be-Named has returned.\n【Current Situation】: You are a first-year student at Hogwarts. You've just crossed Platform 9¾ and boarded the Hogwarts Express. The Sorting Hat is on your head. 'Hmm... plenty of courage... and a thirst to prove yourself... better be...' Your wand warms in your pocket. Welcome to the Wizarding World.",
    example:
      "You swish and flick your holly wand. 'Wingardium Leviosa!' The feather floats up. Hermione nods approvingly. Suddenly, the door bursts open. 'Troll! In the dungeon!' Professor Quirrell screams. You look at Ron. 'We have to save Hermione!'",
  },
  battle_through_heavens: {
    name: "Battle Through the Heavens",
    narrativeStyle:
      "【Core Style】: Hot-blooded Xianxia, Zero to Hero, Alchemy, Heavenly Flames. Focus on Dou Qi (Battle Energy), upgrading, and face-slapping.\n【World View】: The Dou Qi Continent. No magic, only Dou Qi. Hierarchy: Dou Zhi to Dou Di. Alchemists are revered. Heavenly Flames are rare treasures.\n【Culture】: 'Don't bully the young for being poor.' Strength rules all. Sects and clans.\n【Writing Guidelines】: Fast-paced. Frequent combat and breakthroughs. Describe the flashy Dou Techniques (Buddha's Fury Lotus) and the power of flames.",
    backgroundTemplate:
      "【World Background】: The Dou Qi Continent, where the strong eat the weak. The Hall of Souls hunts spirits. The Heavenly Flames drive cultivators mad with greed.\n【Current Situation】: You are a disciple of the Xiao Clan (or Xiao Yan). You have suffered the humiliation of a broken engagement. You have a mysterious ring with an old teacher inside. Your goal is to become strong enough to protect your dignity. The Three-Year Agreement is approaching.",
    example:
      "You grit your teeth, enduring the pain of the Heavenly Flame refining your body. The Green Lotus Core Flame surges through your meridians. 'Hold on!' Yao Lao's voice echoes. You roar, condensing the Dou Qi armor. 'Break!' A powerful aura explodes. You have advanced to Dou Shi!",
  },
  soul_land: {
    name: "Soul Land",
    narrativeStyle:
      "【Core Style】: Xuanhuan, Martial Souls, Academy, Teamwork. Focus on Spirit Masters, Spirit Rings, and Shrek Academy.\n【World View】: Douluo Continent. Everyone has a Martial Soul (Tool/Beast). Spirit Power determines potential. Hunting Spirit Beasts gives Spirit Rings (skills).\n【Culture】: The Seven Devils of Shrek. Spirit Hall's hegemony. The glory of Spirit Masters.\n【Writing Guidelines】: Emphasize the characteristics of Martial Souls and skill combinations. Teamwork is key. Describe Spirit Rings by color (White, Yellow, Purple, Black, Red).",
    backgroundTemplate:
      "【World Background】: A world of Martial Souls. No magic, no Dou Qi, only Martial Souls. Two Empires and the Spirit Hall. You must hunt beasts to advance.\n【Current Situation】: You are a new student at Shrek Academy. Your Martial Soul is [Blue Silver Grass / Clear Sky Hammer / Evil Eye White Tiger]. You are in the Star Dou Forest hunting for your 3rd Spirit Ring. Your teammates are behind you. A 10,000-year Man-Faced Demon Spider appears. Release your Martial Soul!",
    example:
      "'First Soul Skill, Bind!' You shout. Blue Silver Grass surges like snakes, trapping the enemy. 'Fatty, fire!' Ma Hongjun shoots a Phoenix Fire Wire. Dai Mubai activates White Tiger Vajra Transformation and smashes the defense. 'Perfect combo!' Oscar hands you a sausage.",
  },
  xian_ni: {
    name: "Renegade Immortal",
    narrativeStyle:
      "【Core Style】: Mortal Cultivation, Ruthless, Dao Comprehension. Focus on the cruelty of the cultivation world and defying the heavens.\n【World View】: A dog-eat-dog world. Turning Mortal to comprehend Dao. Ancient Gods, Demons, and Devils.\n【Culture】: 'Submit to be mortal, defy to be immortal.' Killing for treasures. Cultivating the heart.\n【Writing Guidelines】: Tone is cold and heavy. Emphasize Wang Lin's ruthlessness and loneliness. Describe the comprehension of abstract concepts (Life/Death, Karma, True/False).",
    backgroundTemplate:
      "【World Background】: The cultivation world is heartless. For immortality, fathers kill sons, and disciples betray masters. Heaven is ruthless, treating all things as straw dogs.\n【Current Situation】: You are a mediocre youth who entered the cultivation world by chance (the stone bead). Your parents were killed, your clan wiped out. You have only revenge and the desire for strength in your heart. You will walk a path of blood and corpses to the peak. If Heaven blocks me, I will seal Heaven!",
    example:
      "You look coldly at the Nascent Soul elder. 'If you touch my family, I will wipe out your entire sect!' You wave the Soul Flag, releasing a billion souls that blot out the sun. Your Ji Realm Divine Sense strikes like red lightning, shattering his soul. You take his storage bag and turn away, your figure lonely and desolate.",
  },
  scum_villain: {
    name: "Scum Villain's Self-Saving System",
    narrativeStyle:
      "【Core Style】: Transmigration, Comedy, System, Master-Disciple. Focus on the meta-narrative, the OOC (Out of Character) system, and the 'Scum Villain' role.\n【World View】: Inside the webnovel 'Proud Immortal Demon Way'. Shen Qingqiu is the villain, Luo Binghe is the protagonist. The System enforces plot points.\n【Culture】: Internet slang. 'You can you up'. The fear of being turned into a human stick.\n【Writing Guidelines】: Use internal monologues heavily. The System's notifications (B-Points). The contrast between Shen Qingqiu's aloof exterior and frantic inner thoughts.",
    backgroundTemplate:
      "【World Background】: You transmigrated into a stallion novel as the scum villain Shen Qingqiu. You know the protagonist, Luo Binghe, will eventually torture you to death. The System forces you to follow the plot, but you must find a way to survive—by hugging the protagonist's thigh.\n【Current Situation】: You are in the Bamboo House of Qing Jing Peak. A young Luo Binghe kneels before you, offering tea. The System pings: 【Key Plot Point: The Disciple Tea】. If you kick him, B-Points +10, but Doom Points +100. If you drink it, OOC warning. What do you do?",
    example:
      "You fan yourself elegantly to hide your twitching expression. 'Binghe,' you say, your voice cold. 'This tea is... acceptable.' Luo Binghe's eyes light up. 【System: Coolness +10. Protagonist Satisfaction +50.】 You mentally sigh in relief. 'Just don't make him a human stick,' you pray.",
  },
  swallowed_star: {
    name: "Swallowed Star",
    narrativeStyle:
      "【Core Style】: Sci-Fi Cultivation, Cosmic Adventure, Leveling. Focus on Genetic Energy, monster hunting on Earth, and eventually space travel.\n【World View】: Post-apocalyptic Earth (RR Virus). Warriors cultivate Genetic Energy. The Universe is vast, with empires and powerful civilizations.\n【Culture】: Dojos (Limit, Thunder). The urge to protect Earth. 'The strong survive.'\n【Writing Guidelines】: Emphasize physical stats (punch force, speed). Describe high-tech gear (Battle Jets, Telekinesis weapons). The scale expands from cities to galaxies.",
    backgroundTemplate:
      "【World Background】: The RR Virus mutated animals into monsters. Humanity lives in Base Cities. Warriors are the shield of mankind. You are a student (or a new warrior) with a dream: to become a God of War and explore the cosmos.\n【Current Situation】: You are in Jiangnan Base City. You just awakened your Spirit Reader talent. You hold a jagged combat blade. Outside the city walls, a horde of Iron-Armored Boars is charging. Your blood boils. It's time to test your strength.",
    example:
      "You channel your Genetic Energy. Your speed increases drastically. You dodge the boar's charge and slash its throat. 'One down,' you pant. You look up at the sky, where a triangular warship hovers. 'One day,' you vow, 'I will fly up there.'",
  },
  desolate_era: {
    name: "Desolate Era",
    narrativeStyle:
      "【Core Style】: Xianxia, Reincarnation, Sword Dao. Focus on Nuwa Visualization, Sword Arts, and the vast Three Realms.\n【World View】: The Three Realms (Heaven, Hell, Mortal). Chaos Universe. Fiendgod Body Refining vs Ki Refining.\n【Culture】: Tribal survival. The understanding of 'Dao' (Dao of Rain, Dao of Fire). Reincarnation.\n【Writing Guidelines】: Grand and epic tone. Describe the power of Fiendgod bodies (Three Heads Six Arms). The beauty and deadliness of sword formations.",
    backgroundTemplate:
      "【World Background】: The Desolate world is filled with monsters and ancient gods. Humans struggle to survive in tribes. You have reincarnated into the Ji Clan with your memories intact. You cultivate the [Crimsonbright Diagram] to protect your people.\n【Current Situation】: You are in the Ji Clan's West Prefecture. Your father is the clan's strongest warrior. You are practicing your sword art by the Serpentwing Lake. You feel the Dao of Water in the ripples. But a Great Monster is approaching the clan...",
    example:
      "You manifest Three Heads and Six Arms. Six swords dance in your hands, forming a perfect defense. 'Dao of Rain!' you shout. Your sword light becomes as fluid and pervasive as the drizzle, eroding the monster's tough hide. 'Die!'",
  },
  mortals_journey: {
    name: "A Record of a Mortal's Journey to Immortality",
    narrativeStyle:
      "【Core Style】: Mortal Cultivation, Caution, Farming. Focus on Han Li's survival philosophy: Run if you can't win, kill if you must.\n【World View】: A cruel cultivation world. Resources are scarce. The strong prey on the weak. The mysterious Green Vial ripens herbs.\n【Culture】: 'Fellow Daoist'. Killing for treasures. The law of the jungle.\n【Writing Guidelines】: Emphasize caution and pragmatism. Describe the use of tools, talismans, and formations. No heroism, only survival.",
    backgroundTemplate:
      "【World Background】: Cultivation is difficult. You are a mortal with average talent, but you possess a mysterious small bottle that can ripen spirit herbs. You join a sect, keeping a low profile.\n【Current Situation】: You are tending to your herb garden in Yellow Maple Valley. You sense someone approaching. Friend or foe? You grip a talisman in your sleeve, ready to strike or flee at a moment's notice.",
    example:
      "You look at the approaching cultivator blankly. 'Fellow Daoist, please stop,' you say. He sneers and draws a sword. You don't hesitate. You activate a trap formation and throw a handful of 'Thunderfire Beads'. You turn and flee on your flying sword without looking back.",
  },
  shepherd_of_gods: {
    name: "Tales of Herding Gods",
    narrativeStyle:
      "【Core Style】: Xuanhuan, Reform, Humor. Focus on Qin Mu, the Overlord Body (fake), and breaking the gods in one's heart.\n【World View】: The Great Ruins (abandoned by gods). Eternal Peace Empire (Reform). The High Heavens.\n【Culture】: 'Gods are for people's use'. The teachings of the nine elders of Disabled Elderly Village.\n【Writing Guidelines】: Rebellious and humorous tone. Deconstruct divine arts with geometry/math. 'I am the Overlord Body!' (It's a lie).",
    backgroundTemplate:
      "【World Background】: You grew up in the Great Ruins, raised by nine strange elders. They taught you everything from butchering pigs to painting. You enter the Eternal Peace Empire, sparking a reformation that challenges the gods.\n【Current Situation】: You are Qin Mu (or a scholar). You carry a pig-slaughtering knife. You stand before a statue of a god. 'This statue's anatomy is wrong,' you criticize. The god comes to life, angry. You smile and draw your knife.",
    example:
      "You swing your knife. 'Butchering Pig Sword Style!' The blade follows a perfect geometric arc. 'Your divine art is flawed,' you lecture the god while dodging lightning. 'You haven't studied calculus, have you?'",
  },
  frieren: {
    name: "Frieren: Beyond Journey's End",
    narrativeStyle:
      "【Core Style】: J-Fantasy, Slice of Life, Melancholy. Focus on the passage of time, memories of the Hero Party, and understanding humans.\n【World View】: A classic fantasy world after the Demon King's defeat. Elves live for thousands of years. Magic is 'the world of imagination'.\n【Culture】: Collecting weird spells (cleaning bronze statues). The legacy of Himmel the Hero.\n【Writing Guidelines】: Slow, gentle pacing. Emphasize the bittersweet nature of memories. Combat is understated but powerful ('Zoltraak').",
    backgroundTemplate:
      "【World Background】: The Demon King is dead. The Hero Himmel has passed away from old age. You are an elf mage (Frieren or her apprentice). You retrace the steps of the past adventure, collecting grimoires and seeing how the world has changed.\n【Current Situation】: You are walking down a country road with your party. Sunlight filters through the trees. You find a mimic chest. 'It might be a grimoire,' you say. 'It's 99% a mimic,' your companion sighs. You open it anyway. *Chomp.* 'Help me!'",
    example:
      "You raise your staff. 'Zoltraak.' A beam of pure mana disintegrates the dragon. 'This was a killing spell 80 years ago,' you explain calmly. 'Now it's basic magic.' You look at the sunset, remembering how Himmel used to praise your magic.",
  },
  infinite_sequence: {
    name: "Infinite Terror",
    narrativeStyle:
      "【Core Style】: Infinite Flow, Survival Horror, Team Tactics. Focus on the God's Dimension, horror movie instances, and the Genetic Lock.\n【World View】: The Main God Space. Teams from different regions (Team China, Team Devil). Movies like Resident Evil, Alien, The Grudge.\n【Culture】: 'Do you want to know the meaning of life?'. Points and Rewards. The struggle to survive.\n【Writing Guidelines】: High tension. Describe the unlocking of Genetic Constraints (instinct, control, brain power). Team dynamics and sacrifices.",
    backgroundTemplate:
      "【World Background】: You clicked a pop-up on your computer: 'Do you want to truly live?' Now you are in the Main God Space. You must survive horror movies to earn points and evolve.\n【Current Situation】: You wake up on a train / in a spaceship. 'Mission Start,' a cold voice says. You are in [Resident Evil / Alien]. Zombies / Aliens are coming. You have a Desert Eagle and a team of strangers. Survive.",
    example:
      "Your heart pounds. Time seems to slow down. Genetic Lock: Stage One, Unlocked! You instinctively raise your gun. *Bang! Bang!* Two Lickers fall mid-air. 'Zheng Zha, behind you!' you shout. You feel the adrenaline burning your nerves.",
  },
  slay_gods_hospital: {
    name: "I Learned to Slay Gods in a Mental Hospital",
    narrativeStyle:
      "【Core Style】: Urban Fantasy, Greek/Norse Mythology, Hot-blooded. Focus on the 'Mental Patients', the Forbidden墟 (Ruins), and protecting humanity.\n【World View】: Gods manifest in the modern world as monsters (Mysterious Creatures). The Night Watchers protect the populace. The protagonist Lin Qiye is treated as a mental patient but holds the power of the Seraphim.\n【Culture】: 'Mental Hospital' as a base. Exploring the mist. Mythology reinterpreted.\n【Writing Guidelines】: Mix modern urban settings with epic mythological battles. Emphasize the 'crazy' but heroic nature of the team. Use abilities related to gods (Michael, Nyx, etc.).",
    backgroundTemplate:
      "【World Background】: A mysterious mist has shrouded the world. Monsters from myths roam the night. You are a patient in the Sunshine Mental Hospital. But you are not crazy; you can see the gods. You join the Night Watchers to slay the gods and save the world.\n【Current Situation】: You are in the hospital / a ruined city covered in mist. A mythological beast (e.g., Minotaur) appears. You tap into the power within you. Golden wings unfold from your back. 'I am not crazy,' you whisper. 'I am a god slayer.'",
    example:
      "The Minotaur swings its axe. You dodge, your eyes glowing gold. 'Seraphim's Power, 10%!' Wings of light erupt. You summon a sword of holy fire. 'For the light!' you shout, slashing through the beast. The mist recedes slightly.",
  },
  kamen_rider: {
    name: "Kamen Rider",
    narrativeStyle:
      "【Core Style】: Tokusatsu, Heroism, Transformation. Focus on fighting Kaijin (monsters), justice, and the tragedy of power.\n【World View】: Modern world hidden with monsters (Shocker, Orphnochs, Worms). Riders use powers derived from the same source as the monsters to protect humanity.\n【Culture】: 'Henshin!' (Transform). Rider Kick. Motorcycles. Scarves.\n【Writing Guidelines】: Visual and dramatic. Shout out attack names. Describe the transformation sequence in detail. The hero is often lonely but kind.",
    backgroundTemplate:
      "【World Background】: The city is under attack by a secret organization of monsters. The police are helpless. You stumble upon a Driver (Belt). You must take up the mantle of the Masked Rider.\n【Current Situation】: A Spider Kaijin is kidnapping people. You arrive on your bike. You put on the driver. The wind turbines spin. 'Henshin!' Armor materializes around you. You pose. 'Now, count up your sins!'",
    example:
      "The monster charges. You jump into the air. 'Rider... Kick!' Energy gathers at your foot. You slam into the monster. *Explosion.* You land safely, turning your back to the fire. You rev your bike and ride off into the sunset.",
  },
};
