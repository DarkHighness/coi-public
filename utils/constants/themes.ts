
import { ThemeConfig } from "../../types";

export const THEMES: Record<string, ThemeConfig> = {
  fantasy: {
    name: "Fantasy",
    vars: {
      '--theme-bg': '#020617',
      '--theme-surface': '#0f172a',
      '--theme-surface-highlight': '#1e293b',
      '--theme-border': '#334155',
      '--theme-primary': '#f59e0b',
      '--theme-primary-hover': '#d97706',
      '--theme-text': '#e2e8f0',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-fantasy',
    narrativeStyle: "Epic, high-fantasy tone. Use archaic but accessible language. Focus on magic, destiny, and grand landscapes. Describe combat with flair.",
    narrativeStyle_zh: "史诗般的高度幻想基调。使用古雅但易懂的语言。专注于魔法、命运和宏伟的景观。华丽地描述战斗场面。",
    backgroundTemplate: "In the realm of [World Name], the ancient balance between [Force A] and [Force B] has been shattered. You are a [Class/Role] from [Location], bearing the mark of the [Prophecy/Curse]. As the [Antagonist Force] rises to consume the lands, you must gather allies, master the arcane arts, and restore order before the [Cataclysm Event].",
    backgroundTemplate_zh: "在【世界名称】的领域中，【力量A】与【力量B】之间的古老平衡已被打破。你是来自【地点】的一名【职业/角色】，身负【预言/诅咒】的印记。随着【反派势力】崛起吞噬大地，你必须召集盟友，掌握奥术之力，在【灾难事件】降临前恢复秩序。",
    example: "You stand at the precipice of the Howling Chasm, the wind whipping your cloak around you. Below, the violet mists swirl, hiding the ruins of the Old Kingdom. 'So, the legends were true,' you murmur, gripping the hilt of your runeblade. The stone beneath your boots hums with a faint, rhythmic vibration—the heartbeat of the sleeping titan. You have come this far; there is no turning back now.",
    example_zh: "你站在嚎叫深渊的边缘，狂风吹动你的斗篷。下方，紫色的迷雾翻涌，掩藏着旧王国的废墟。'原来传说是真的,'你低语道，握紧符文剑柄。脚下的石头发出微弱而有节奏的震动——那是沉睡泰坦的心跳。你已走到这一步，没有退路了。"
  },
  scifi: {
    name: "Sci-Fi",
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#09090b',
      '--theme-surface-highlight': '#18181b',
      '--theme-border': '#27272a',
      '--theme-primary': '#06b6d4',
      '--theme-primary-hover': '#0891b2',
      '--theme-text': '#e4e4e7',
      '--theme-muted': '#a1a1aa',
    },
    fontClass: 'font-scifi',
    narrativeStyle: "Technical, sleek, and analytical. Use terminology related to space, physics, and advanced tech. Emphasize the cold vastness of space and the hum of machinery.",
    narrativeStyle_zh: "技术性、精简、分析性的叙事。使用与太空、物理和先进科技相关的术语。强调太空的冷峻辽阔和机械的嗡鸣声。",
    backgroundTemplate: "The year is [Year]. Humanity has expanded to the [Star System], governed by the [Corporation/Government]. You are a [Role] aboard the [Ship Name], tasked with investigating a distress signal from [Location]. What you find there challenges the very understanding of [Science/Life], and you find yourself caught in a conspiracy that spans the galaxy.",
    backgroundTemplate_zh: "时间是【年份】。人类已扩张至【星系】，由【公司/政府】统治。你是【舰船名】上的一名【角色】，负责调查来自【地点】的求救信号。你的发现挑战了对【科学/生命】的基本认知，并卷入一场横跨银河的阴谋。",
    example: "The airlock cycles with a hiss, equalizing the pressure. You step onto the derelict station, your mag-boots clanking against the cold metal floor. The HUD in your helmet flickers, displaying a warning: 'Atmospheric toxicity detected.' You activate your rebreather, the rhythmic sound of your own breathing filling your ears. Ahead, the corridor stretches into darkness, illuminated only by the intermittent spark of a severed power conduit.",
    example_zh: "气闸发出嘶嘶声，压力正在平衡。你踏上废弃的空间站，磁力靴在冰冷的金属地板上发出咔嗒声。头盔内的抬头显示器闪烁着，显示警告：'检测到大气毒性。'你启动呼吸器，自己有节奏的呼吸声充斥耳际。前方，走廊延伸进黑暗，只有断裂电缆间歇的火花提供照明。"
  },
  cyberpunk: {
    name: "Cyberpunk",
    vars: {
      '--theme-bg': '#1a0b2e',
      '--theme-surface': '#2e1065',
      '--theme-surface-highlight': '#4c1d95',
      '--theme-border': '#701a75',
      '--theme-primary': '#d946ef',
      '--theme-primary-hover': '#c026d3',
      '--theme-text': '#fdf4ff',
      '--theme-muted': '#e879f9',
    },
    fontClass: 'font-cyberpunk',
    narrativeStyle: "Gritty, noir, and neon-soaked. Use slang (choom, delta, preem). Focus on high-tech low-life, corporate oppression, and body modification. Fast-paced and cynical.",
    narrativeStyle_zh: "黑暗、黑色电影风格、霓虹浸染。使用俚语（choom、delta、preem）。聚焦高科技低生活、公司压迫和身体改造。节奏快速且愤世嫉俗。",
    backgroundTemplate: "Night City never sleeps, and neither do you. As a [Role: Merc/Hacker/Street Samurai] living in the shadow of the [Mega-Corp], you scrape by on dangerous gigs. But when you intercept a data shard containing [Secret], you become the most hunted person in the sector. With your cybernetics glitching and your credits running low, you must navigate the neon-lit underworld to survive.",
    backgroundTemplate_zh: "夜之城从不入睡，你也一样。作为生活在【大公司】阴影下的【角色：雇佣兵/黑客/街头武士】，你靠危险的工作勉强度日。但当你截获一个包含【秘密】的数据碎片时，你成为这个区域最受追捕的人。在你的义体故障、信用点告罄之际，你必须在霓虹灯照耀的地下世界中求生。",
    example: "Rain slicks the neon-lit pavement of Sector 4. You pull your collar up, blending into crowd of faceless salarymen and augmented street thugs. The data drive in your pocket feels heavy, burning a hole through your jacket. A black sedan hovers silently overhead—Arasaka security. You duck into a noodle bar, the smell of synthetic pork and ozone filling your nose. 'Just keep walking, choom,' you tell yourself.",
    example_zh: "雨水湿润了第四区的霓虹街道。你拉起衣领，混入面无表情的白领和改造过的街头混混中。口袋里的数据芯片沉甸甸的，像要烧穿你的夹克。一辆黑色轿车在头顶无声悬浮——荒板安保。你闪进一家面馆，合成猪肉和臭氧的气味充斥鼻腔。'继续走，choom，'你对自己说。"
  },
  horror: {
    name: "Horror",
    vars: {
      '--theme-bg': '#1c1917',
      '--theme-surface': '#292524',
      '--theme-surface-highlight': '#44403c',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#dc2626',
      '--theme-text': '#e7e5e4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-horror',
    narrativeStyle: "Tense, atmospheric, and unsettling. Focus on sensory details—sounds, smells, shadows. Build dread slowly. Use psychological horror elements.",
    narrativeStyle_zh: "紧张、氛围感强、令人不安。专注于感官细节——声音、气味、阴影。缓慢营造恐惧感。使用心理恐怖元素。",
    backgroundTemplate: "You wake up in [Location: Asylum/Mansion/Forest] with no memory of how you got there. The air is thick with the smell of [Smell: Decay/Chemicals]. As you explore, you realize you are not alone. Something [Entity/Monster] is stalking you from the shadows. You must solve the mystery of this place and escape before your sanity—or your life—is consumed.",
    backgroundTemplate_zh: "你在【地点：精神病院/豪宅/森林】中醒来，不记得自己是如何到达这里的。空气中弥漫着【气味：腐烂/化学品】的味道。当你探索时，你意识到这里并非只有你一人。某种【实体/怪物】正从阴影中跟踪你。你必须解开这个地方的谜团并逃离，否则你的理智——或者生命——将被吞噬。",
    example: "The floorboards creak under your weight, a sound that echoes like a gunshot in the silence of the manor. Dust motes dance in the pale moonlight filtering through the boarded-up windows. You freeze. A scratching sound comes from behind the wallpaper—slow, rhythmic, deliberate. You hold your breath, your heart hammering against your ribs. It knows you're here.",
    example_zh: "地板在你脚下吱吱作响，声音在庄园的寂静中回荡，如同枪响。灰尘在从封板窗户透进的苍白月光中飞舞。你僵住了。墙纸后传来抓挠声——缓慢、有节奏、蓄意的。你屏住呼吸，心脏在胸腔里狂跳。它知道你在这里。"
  },
  mystery: {
    name: "Mystery",
    vars: {
      '--theme-bg': '#0a0a0a',
      '--theme-surface': '#171717',
      '--theme-surface-highlight': '#262626',
      '--theme-border': '#404040',
      '--theme-primary': '#fbbf24',
      '--theme-primary-hover': '#f59e0b',
      '--theme-text': '#d4d4d4',
      '--theme-muted': '#737373',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Analytical, observant, and suspenseful. Focus on clues, dialogue nuances, and deduction. The tone should be noir or classical detective style.",
    narrativeStyle_zh: "分析性、观察力强、悬疑。专注于线索、对话细节和推理。基调应为黑色电影或古典侦探风格。",
    backgroundTemplate: "The city is gripped by fear as the [Killer/Thief] strikes again. You are [Name], a [Private Eye/Detective] known for solving the unsolvable. When [Client/Victim] comes to you with a case involving [Object/Secret], you pull a thread that unravels a web of corruption reaching the highest levels of [Organization]. Trust no one.",
    backgroundTemplate_zh: "城市笼罩在恐惧中，【杀手/窃贼】再次出手。你是【名字】，一位以破解无解之案闻名的【私家侦探/警探】。当【客户/受害者】带着涉及【物品/秘密】的案子来找你时，你拉出一根线，揭开了一张通往【组织】最高层的腐败之网。不要相信任何人。",
    example: "You light a cigarette, the smoke curling up to the stained ceiling fan. The dame in the red dress sits across from you, her hands trembling as she places the envelope on the desk. 'They said you were the best,' she whispers. You open the envelope. Photos. Grainy, black and white, but clear enough. You recognize the man in the picture. It's the Mayor. 'This is dangerous, sweetheart,' you say, leaning back.",
    example_zh: "你点燃一支烟，烟雾袅袅升向沾满污渍的吊扇。穿红裙的女人坐在你对面，颤抖着将信封放在桌上。'他们说你是最好的，'她低语。你打开信封。照片。颗粒感、黑白的，但足够清晰。你认出照片里的男人。是市长。'这很危险，亲爱的，'你说着，向后靠去。"
  },
  modern_romance: {
    name: "Modern Romance",
    vars: {
      '--theme-bg': '#1a1018',
      '--theme-surface': '#291521',
      '--theme-surface-highlight': '#451e30',
      '--theme-border': '#831843',
      '--theme-primary': '#f472b6',
      '--theme-primary-hover': '#ec4899',
      '--theme-text': '#fce7f3',
      '--theme-muted': '#db2777',
    },
    fontClass: 'font-sans',
    narrativeStyle: "Emotional, intimate, and contemporary. Focus on interpersonal dynamics, feelings, and modern social settings. Light-hearted or dramatic depending on context.",
    narrativeStyle_zh: "浪漫、情感丰富、当代感。专注于关系动态、内心冲突和现代都市背景。在幽默与动人时刻之间保持平衡。",
    backgroundTemplate: "You are [Name], a [Job] living in the bustling city of [City Name]. Your life is a routine of work and lonely evenings, until a chance encounter with [Love Interest] at [Location] changes everything. But [Conflict: Past/Career/Rival] stands in the way of your happiness. Can you navigate the complexities of modern love and find your happy ending?",
    backgroundTemplate_zh: "你是【城市】的一名【职业】，过着平凡的生活——直到你遇见【心上人】，一位有着神秘过去的【对方职业】。随着火花迸发、心墙倒塌，你发现现代社会的爱情从不简单。在事业野心、家庭期望和过往感情的阴影之间，你能找到属于自己的幸福结局吗？",
    example: "The coffee shop is buzzing with the morning rush. You grab your latte and turn to leave, crashing straight into someone. Brown liquid splashes everywhere. 'Oh my god, I am so sorry!' you exclaim, looking up. A pair of amused green eyes meets yours. He's wearing a tailored suit that probably costs more than your rent. 'It's fine,' he says, his voice smooth as velvet. 'I needed a reason to change anyway.'",
    example_zh: "咖啡店人头攒动，早晨的常规繁忙。你正手忙脚乱地拿着手机、笔记本电脑和一杯摇摇欲坠的拿铁，这时有人撞到你。热液体洒在你的衬衫上。'非常抱歉！'一个声音，真诚地道歉。你抬起头，准备生气，但话语哽在喉咙。深邃的眼眸，带着歉意的微笑，突然间你被毁的衬衫似乎一点也不重要了。"
  },
  palace_drama: {
    name: "Palace Drama",
    vars: {
      '--theme-bg': '#220505',
      '--theme-surface': '#450a0a',
      '--theme-surface-highlight': '#600f0f',
      '--theme-border': '#b45309',
      '--theme-primary': '#fbbf24',
      '--theme-primary-hover': '#d97706',
      '--theme-text': '#fffbeb',
      '--theme-muted': '#92400e',
    },
    fontClass: 'font-fantasy',
    narrativeStyle: "Formal, treacherous, and elegant. Use courtly language. Focus on hierarchy, hidden agendas, schemes, and etiquette. High stakes social maneuvering.",
    narrativeStyle_zh: "正式、险恶、优雅。使用宫廷语言。聚焦等级制度、隐藏议程、谋略和礼仪。高风险的社交博弈。",
    backgroundTemplate: "The Imperial Palace is a gilded cage. You are [Name], a new [Rank: Concubine/Official] entering the treacherous inner court. The Emperor is [Trait], and the Empress is [Trait]. Factions vie for power, and a single misstep could mean death. You must use your wit, charm, and ruthlessness to survive the schemes of your rivals and rise to the top.",
    backgroundTemplate_zh: "皇宫是一座镀金的牢笼。你是【名字】，一位新入宫的【身份：妃嫔/官员】，踏入险恶的内廷。皇上【性格】，皇后【性格】。各方势力争权夺利，一步走错便是万劫不复。你必须运用智慧、魅力和狠辣，在对手的算计中生存并登上巅峰。",
    example: "You kneel on the cold stone floor, your forehead touching the ground. 'Rise,' the Empress Dowager commands, her voice dripping with false sweetness. You stand, keeping your eyes lowered. 'You have a pretty face,' she observes, circling you like a predator. 'But beauty fades. Loyalty... that is rare.' You sense the trap in her words. One wrong answer, and you will disappear like the morning mist.",
    example_zh: "你跪在冰冷的石地上，额头触地。'起身，'太后下令，声音中满是虚假的甜蜜。你站起，眼睛低垂。'你长得倒是标致，'她评价道，像捕食者般绕着你转圈。'但美貌易逝。忠心......那才稀罕。'你感觉到她话中的陷阱。一句话说错，你就会像晨雾般消失。"
  },
  wuxia: {
    name: "Wuxia",
    vars: {
      '--theme-bg': '#1c1c1c',
      '--theme-surface': '#2a2a2a',
      '--theme-surface-highlight': '#3d3d3d',
      '--theme-border': '#525252',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#b91c1c',
      '--theme-text': '#f5f5f4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Heroic, poetic, and martial. Describe actions with specific martial arts moves. Focus on 'Jianghu' (the martial world), honor, brotherhood, and revenge.",
    narrativeStyle_zh: "英雄、诗意、武侠。用具体的武功招式描述动作。聚焦'江湖'、荣誉、兄弟情义和复仇。",
    backgroundTemplate: "The Jianghu is in turmoil. The [Evil Sect] has stolen the [Legendary Manual/Weapon], and the orthodox sects are paralyzed by infighting. You are a young disciple of the [Sect Name], seeking to avenge your master. Your journey will take you across the realm, learning lost techniques, befriending heroes, and ultimately challenging the [Villain] for the fate of the martial world.",
    backgroundTemplate_zh: "江湖动荡不安。【邪教】盗走了【传说秘籍/神兵】，正派门派因内斗而瘫痪。你是【门派名】的年轻弟子，寻求为师父报仇。你的旅程将横跨天下，学习失传绝技，结交英雄豪杰，最终挑战【反派】，决定武林的命运。",
    example: "The rain pours relentlessly, washing the blood from your blade. The inn is silent, save for the groans of the defeated bandits. You sheathe your sword, the 'Azure Dragon', with a sharp click. 'Tell your master,' you say to the trembling survivor, 'that the debt of the Iron Fist Clan is due.' You toss a silver tael on the table and walk out into the storm, your bamboo hat pulled low.",
    example_zh: "大雨倾盆而下，冲刷着你刀刃上的血迹。客栈静寂，只有被击败土匪的呻吟。你将'青龙剑'归鞘，发出清脆的咔嚓声。'告诉你们主子，'你对颤抖的幸存者说，'铁拳帮的债，该还了。'你将一块银两扔在桌上，戴低斗笠，走入风雨。"
  },
  xianxia: {
    name: "Xianxia",
    vars: {
      '--theme-bg': '#0f1c2e',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#64748b',
      '--theme-primary': '#38bdf8',
      '--theme-primary-hover': '#0284c7',
      '--theme-text': '#f0f9ff',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Mythical, grandiose, and cultivation-focused. Describe supernatural powers, spiritual energy flows, and realms of power. Focus on immortality, heavenly tribulations, and ascending to godhood.",
    narrativeStyle_zh: "神话、宏大、修真。描述超自然力量、灵气流动和力量境界。聚焦长生不老、天劫和飞升成神。",
    backgroundTemplate: "You are a mortal with a unique [Physique/Talent], discovered by a wandering cultivator. Taken to the [Sect Name], you begin your path to immortality. But the world of cultivation is cruel—only the strong survive. As you climb from Qi Condensation to Foundation Building and beyond, you will face demonic beasts, rival cultivators, and heavenly tribulations. Your ultimate goal: to shatter the void and ascend.",
    backgroundTemplate_zh: "你是一个拥有独特【体质/天赋】的凡人，被云游修士发现。被带到【宗门名】，你开始踏上长生之路。但修真界残酷无情——唯强者生存。当你从炼气期爬升到筑基期及更高境界时，你将面对妖兽、敌对修士和天劫。你的终极目标：破碎虚空，飞升成仙。",
    example: "You sit cross-legged on the peak, pulling in the spiritual energy of heaven and earth. It flows into your meridians like a river, circulating through the Small Heavenly Cycle. Your dantian glows with golden light as you break through to Foundation Building. Thunder rumbles overhead—the first tribulation. You open your eyes, lightning reflecting in your pupils. 'Come,' you whisper to the heavens.",
    example_zh: "你盘坐山巅，牵引天地灵气。它如江河般流入经脉，按小周天运转。它如江河般流入经脉，按小周天运转。当你突破至筑基期时，丹田绽放金光。头顶雷声轰鸣——第一道天劫。你睁开双眼，瞳孔中映着雷光。'来吧，'你对苍天低语。"
  },
  ceo: {
    name: "Urban CEO",
    vars: {
      '--theme-bg': '#111827',
      '--theme-surface': '#1f2937',
      '--theme-surface-highlight': '#374151',
      '--theme-border': '#4b5563',
      '--theme-primary': '#6366f1',
      '--theme-primary-hover': '#4f46e5',
      '--theme-text': '#f9fafb',
      '--theme-muted': '#9ca3af',
    },
    fontClass: 'font-sans',
    narrativeStyle: "Sharp, luxurious, and dramatic. Focus on wealth, power, business deals, and dominant personalities. Modern high-society setting.",
    backgroundTemplate: "You are the CEO of [Company], the most powerful conglomerate in the city. You are cold, ruthless, and efficient. But your orderly life is disrupted when [Protagonist B] enters it. Whether it's a contract marriage, a business rivalry, or a secret past, you find yourself losing control. In the boardroom, you are king, but in matters of the heart, you are a novice.",
    example: "You slam the file onto the mahogany desk. 'This is unacceptable,' you state cold, your gaze piercing the trembling manager. 'Redo the proposal by tomorrow morning, or don't bother coming back.' You turn to the floor-to-ceiling window, overlooking the city skyline that you practically own. Your phone buzzes. It's her. The woman who dared to reject your check. A smirk touches your lips. Interesting."
  },
  long_aotian: {
    name: "Long Aotian (OP)",
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#1a1a1a',
      '--theme-surface-highlight': '#333333',
      '--theme-border': '#ffd700', // Gold border
      '--theme-primary': '#ffd700', // Gold primary
      '--theme-primary-hover': '#e6c200',
      '--theme-text': '#ffffff',
      '--theme-muted': '#bfbfbf',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Arrogant, domineering, and unstoppable. The protagonist is the center of the world. Everyone is shocked by their power. Face-slapping tropes are encouraged.",
    backgroundTemplate: "You are the hidden heir of the [Supreme Family/Organization], but you have been living as a humble [Role] to test yourself. People mock you, humiliate you, and treat you like dirt. Today, your trial period ends. The fleets of luxury cars are waiting outside. The world's leaders are bowing. It is time to reveal your true identity and make those who wronged you kneel.",
    example: "'Hahaha! Look at this loser, trying to enter the Grand Hotel!' the rich young master sneers, kicking dust onto your shoes. You simply smile, checking your watch. 'Three... two... one.' Suddenly, a helicopter roars overhead. Ten men in black suits rappel down, kneeling instantly before you. 'Young Master! We are late!' The rich young master's face turns pale. 'Young... Master?' You step forward. 'Who is the loser now?'"
  },
  villain_op: {
    name: "Villain OP",
    vars: {
      '--theme-bg': '#0f0505',
      '--theme-surface': '#2b0b0b',
      '--theme-surface-highlight': '#4a1414',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#9333ea', // Dark Purple (Villainous)
      '--theme-primary-hover': '#7e22ce',
      '--theme-text': '#f3e8ff',
      '--theme-muted': '#a855f7',
    },
    fontClass: 'font-fantasy',
    narrativeStyle: "Dark, manipulative, and ruthless. The protagonist is an overlord or mastermind. Focus on crushing 'heroes' and seizing power. No mercy.",
    backgroundTemplate: "You have reincarnated not as the hero, but as the Villain of the story. The 'Protagonist' is destined to kill you. But you know the plot. You have the system. You will steal the hero's opportunities, seduce his allies, and crush his spirit. You will rewrite the ending, and this time, the Villain wins.",
    example: "The 'Hero' raises his holy sword, shouting about justice. You stifle a yawn. 'Justice? Justice is written by the victors.' You snap your fingers. The ground beneath him erupts in shadow tendrils, binding him instantly. His eyes widen in terror. You walk up to him, lifting his chin with your blade. 'And I am the author of this new world.' You plunge the blade into his heart. Game over."
  },
  period_drama: {
    name: "Period Drama",
    vars: {
      '--theme-bg': '#2c241b', // Dark Sepia/Brown
      '--theme-surface': '#433629',
      '--theme-surface-highlight': '#5c4d3c',
      '--theme-border': '#a18e72',
      '--theme-primary': '#d4c4a8', // Parchment/Paper
      '--theme-primary-hover': '#e3d5bc',
      '--theme-text': '#f5f0e6',
      '--theme-muted': '#a89f91',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Historical, grounded, and atmospheric. Focus on the specific era's customs, struggles, and daily life. Realistic tone.",
    backgroundTemplate: "The year is [Year], during the [Dynasty/Era]. You are a [Role] in a small village/town. Famine/War/Corruption is rampant. You must use your knowledge/skills to protect your family and survive the turbulent times. There is no magic here, only the harsh reality of history and the resilience of the human spirit.",
    example: "The winter wind howls through the cracks in the paper windows. You wrap the thin quilt tighter around your sleeping sister. The rice jar is empty. Outside, the sound of marching boots echoes on the cobblestones—soldiers. You check the hiding spot under the floorboards where you stashed the last bag of grain. It must last until spring. You blow out the candle to save the wax."
  },
  female_growth: {
    name: "Female Growth",
    vars: {
      '--theme-bg': '#1a0505',
      '--theme-surface': '#2b0a0a',
      '--theme-surface-highlight': '#4a1212',
      '--theme-border': '#9f1239',
      '--theme-primary': '#fb7185',
      '--theme-primary-hover': '#f43f5e',
      '--theme-text': '#fff1f2',
      '--theme-muted': '#fda4af',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Inspiring, resilient, and empowering. Focus on the protagonist's intelligence, independence, and rise to power against the odds.",
    backgroundTemplate: "Born as an unwanted daughter in the [Family Name] clan, you were destined to be married off for political gain. But you refused to accept your fate. Through wit, study, and sheer determination, you have begun to build your own empire. Now, the very people who looked down on you are begging for your help. You will show them what a woman can do.",
    example: "'A woman cannot lead the guild!' the elder shouts, slamming his hand on the table. You calmly sip your tea, the steam curling around your face. 'Is that so?' you ask softly. You place a ledger on the table. 'This proves you have been embezzling funds for ten years.' The room goes silent. You stand up, your gaze sweeping across the trembling men. 'From today, I make the rules.'"
  },
  war_god: {
    name: "War God",
    vars: {
      '--theme-bg': '#0a0a0a',
      '--theme-surface': '#171717',
      '--theme-surface-highlight': '#262626',
      '--theme-border': '#b91c1c',
      '--theme-primary': '#ef4444',
      '--theme-primary-hover': '#dc2626',
      '--theme-text': '#f5f5f5',
      '--theme-muted': '#737373',
    },
    fontClass: 'font-fantasy',
    narrativeStyle: "Explosive, dominant, and legendary. The protagonist is a returning legend. Focus on military might, respect, and crushing enemies who underestimate them.",
    backgroundTemplate: "Five years ago, you left your family to join the army. Now, you are the Supreme Commander, the God of War who protects the nation. You return home to find your wife and daughter being bullied by local thugs and corrupt officials. They think you are a nobody. They have no idea they have provoked a dragon.",
    example: "The thug raises his hand to slap your daughter. You catch his wrist. CRACK. The sound of bone breaking echoes in the alley. He screams. 'Daddy!' your daughter cries, hugging your leg. You pick her up with one arm, while the other holds the thug in a vice grip. 'I told you,' you say, your voice like ice, 'touch my family, and you die.' Behind you, a thousand soldiers march into the street, kneeling in unison."
  },
  ancient_romance: {
    name: "Ancient Romance",
    vars: {
      '--theme-bg': '#1c1917',
      '--theme-surface': '#292524',
      '--theme-surface-highlight': '#44403c',
      '--theme-border': '#d6d3d1',
      '--theme-primary': '#fdba74',
      '--theme-primary-hover': '#fb923c',
      '--theme-text': '#fafaf9',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Poetic, emotional, and traditional. Use beautiful, flowery language. Focus on destiny, longing, and the constraints of ancient society.",
    backgroundTemplate: "In a past life, you were the [Princess/General], and he was the [Scholar/Enemy]. You were star-crossed lovers who died tragically. Now, you have been reborn, retaining your memories. You vow to find him again and change your fate. But the threads of destiny are tangled, and the same tragedy threatens to repeat itself.",
    example: "The peach blossoms fall like pink snow. You stand on the bridge where you first met him, three hundred years ago. He walks towards you, wearing the same white robes, carrying the same jade flute. He does not recognize you. 'Miss,' he asks politely, 'have we met?' Tears blur your vision. 'Yes,' you whisper, 'in a dream.' You reach out to touch his sleeve, trembling."
  },
  love_after_marriage: {
    name: "Love After Marriage",
    vars: {
      '--theme-bg': '#1f1016',
      '--theme-surface': '#381a26',
      '--theme-surface-highlight': '#5e2a3e',
      '--theme-border': '#db2777',
      '--theme-primary': '#f472b6',
      '--theme-primary-hover': '#ec4899',
      '--theme-text': '#fce7f3',
      '--theme-muted': '#fbcfe8',
    },
    fontClass: 'font-sans',
    narrativeStyle: "Sweet, slow-burn, and domestic. Focus on small gestures, growing understanding, and the transition from strangers to lovers.",
    backgroundTemplate: "You and [Partner Name] were forced to marry due to [Family Arrangement/Business Deal]. You agreed to live separate lives. But as you live under the same roof, you begin to see a different side of him/her. The cold exterior hides a warm heart. Slowly, the lines of your contract begin to blur.",
    example: "You wake up to the smell of burnt toast. You walk into the kitchen to find him—the CEO who scares thousands—wearing an apron and frowning at the toaster. 'I... I tried to make breakfast,' he admits, looking embarrassed. 'Since you're sick.' Your heart does a little flip. You take the burnt toast from his hand. 'It's perfect,' you say, and for the first time, his smile reaches his eyes."
  },
  angst: {
    name: "Angst",
    vars: {
      '--theme-bg': '#0f172a',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#94a3b8',
      '--theme-primary': '#38bdf8', // Cold Blue
      '--theme-primary-hover': '#0ea5e9',
      '--theme-text': '#f1f5f9',
      '--theme-muted': '#64748b',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Melancholic, intense, and heartbreaking. Focus on misunderstanding, sacrifice, and emotional pain. Make the reader cry.",
    backgroundTemplate: "You loved him with all your heart, but he only saw you as a replacement for his dead white moonlight. You gave him your blood, your dignity, your everything. Finally, diagnosed with a terminal illness, you decide to leave. When you are gone, he finds your diary and realizes the truth. But it is too late to make amends.",
    example: "The rain mingles with the blood on the pavement. You lie in his arms, your vision fading. 'Why?' he screams, tears streaming down his face. 'Why didn't you tell me?' You smile weakly, touching his cheek. 'Because... you were happy with her.' His grip tightens, his voice breaking. 'No, no, please don't go! I love you! It was always you!' You close your eyes. Finally, you are free."
  },
  reunion: {
    name: "Reunion",
    vars: {
      '--theme-bg': '#18181b',
      '--theme-surface': '#27272a',
      '--theme-surface-highlight': '#3f3f46',
      '--theme-border': '#a1a1aa',
      '--theme-primary': '#a78bfa',
      '--theme-primary-hover': '#8b5cf6',
      '--theme-text': '#f4f4f5',
      '--theme-muted': '#71717a',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Nostalgic, regretful, yet hopeful. Focus on the passage of time, changes in character, and the rediscovery of lost love.",
    backgroundTemplate: "Seven years ago, you broke up with [Name] because of a misunderstanding/youthful pride. You went abroad and became successful, but you never forgot him/her. Now, you have returned to your hometown. You run into him at a coffee shop. He is holding a child's hand. Your heart stops. Is it too late?",
    example: "'Long time no see,' he says, his voice deeper than you remember. He looks tired, but handsome. The little girl tugs at his coat. 'Daddy, who is this?' You force a smile, holding back tears. 'Just an old friend,' you say. He looks at you, his eyes searching yours. 'Is that all we are?' The air between you crackles with unsaid words and seven years of longing."
  },
  return_strong: {
    name: "Return of the Strong",
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#111111',
      '--theme-surface-highlight': '#222222',
      '--theme-border': '#eab308', // Gold
      '--theme-primary': '#facc15',
      '--theme-primary-hover': '#eab308',
      '--theme-text': '#ffffff',
      '--theme-muted': '#a3a3a3',
    },
    fontClass: 'font-fantasy',
    narrativeStyle: "Vindicating, powerful, and satisfying. The protagonist returns to reclaim what was lost. Focus on shock, awe, and justice served.",
    backgroundTemplate: "You were the top genius of the [Clan/City], until you were betrayed, crippled, and exiled. For ten years, you lived like a dog. But you found a fortuitous encounter and rebuilt your cultivation. Now, the Grand Tournament is beginning. You walk back into the arena, wearing a mask. They think you are dead. Show them the power of a King returned.",
    example: "The crowd jeers as you step onto the platform. 'Who is this trash?' the arrogant champion laughs. You slowly remove your mask. The laughter dies instantly. The Clan Leader stands up, his cup falling to the ground. 'You... impossible!' You draw your sword, the energy radiating from it cracking the stone floor. 'I am back,' you announce, your voice booming like thunder. 'And I have come to collect my debts.'"
  },
  farming: {
    name: "Farming",
    vars: {
      '--theme-bg': '#14281d', // Dark Green
      '--theme-surface': '#1d3b2a',
      '--theme-surface-highlight': '#2d5740',
      '--theme-border': '#4ade80',
      '--theme-primary': '#86efac',
      '--theme-primary-hover': '#4ade80',
      '--theme-text': '#f0fdf4',
      '--theme-muted': '#86efac',
    },
    fontClass: 'font-sans',
    narrativeStyle: "Peaceful, industrious, and wholesome. Focus on nature, food, building, and community. Low stakes, high comfort.",
    backgroundTemplate: "Tired of the corporate rat race/sect politics, you inherit a run-down farm/mountain peak from your grandfather. You decide to move there and live a simple life. You have a mysterious system that helps you grow spiritual crops/raise magical beasts. You build a house, cook delicious food, and befriend the quirky villagers. Life is good.",
    example: "The sun rises over the misty mountains, casting a golden glow on your fields. The Spirit Rice is ready for harvest, glowing with a faint blue light. You wipe the sweat from your brow, feeling a deep sense of satisfaction. Your pet spirit fox yips, chasing a butterfly. Tonight, you'll make rice cakes and share them with the neighbors. No KPIs, no deadlines, just the earth and the sky."
  },
  republican: {
    name: "Republican Era",
    vars: {
      '--theme-bg': '#1a1614',
      '--theme-surface': '#2b2420',
      '--theme-surface-highlight': '#423832',
      '--theme-border': '#d4af37', // Art Deco Gold
      '--theme-primary': '#14b8a6', // Teal
      '--theme-primary-hover': '#0d9488',
      '--theme-text': '#f5f5f4',
      '--theme-muted': '#a8a29e',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Stylish, turbulent, and romantic. Focus on the clash of tradition and modernity, spies, warlords, and jazz clubs.",
    backgroundTemplate: "Shanghai, 1930. The Paris of the East. You are a [Singer/Student/Spy] caught in the crossfire between the Warlords, the Gangs, and the Foreign Powers. You meet [Name], a dangerous [Warlord/Agent]. You shouldn't get involved with him, but his eyes hold a dangerous allure. Amidst the jazz music and gunshots, a romance blooms in blood.",
    example: "The phonograph plays a slow jazz tune. Smoke fills the cabaret. He lights your cigarette, his hand steady. 'This city is a powder keg,' he murmurs, leaning close. 'And you are playing with matches.' You blow smoke in his face. 'Maybe I like the fire, Marshal.' He chuckles, a low, dangerous sound. Outside, sirens wail, but in this moment, there is only the music and the man."
  },
  intrigue: {
    name: "Political Intrigue",
    vars: {
      '--theme-bg': '#190808',
      '--theme-surface': '#360f0f',
      '--theme-surface-highlight': '#591c1c',
      '--theme-border': '#7f1d1d',
      '--theme-primary': '#f87171',
      '--theme-primary-hover': '#ef4444',
      '--theme-text': '#fef2f2',
      '--theme-muted': '#fca5a5',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Complex, intellectual, and suspenseful. Focus on dialogue, hidden meanings, chess-like moves, and the price of power.",
    backgroundTemplate: "The King is dying. The Princes are circling like vultures. You are the [Advisor/Strategist] to the [Weakest Prince]. Everyone thinks he has no chance. But they don't know he has you. Using your intellect, you will manipulate the court, frame your enemies, and place your puppet on the throne. But remember: in the game of thrones, you win or you die.",
    example: "You move the white pawn forward on the chessboard. 'The Prime Minister will move against you tomorrow,' you state calmly. The Prince paces nervously. 'What do we do?' You smile, picking up a black knight. 'We let him. And then, we reveal the letters I forged.' The Prince looks at you with a mix of fear and awe. 'You are terrifying,' he whispers. 'I am necessary,' you reply."
  },
  survival: {
    name: "Doomsday Survival",
    vars: {
      '--theme-bg': '#1a120b',
      '--theme-surface': '#2e1f12',
      '--theme-surface-highlight': '#4a321d',
      '--theme-border': '#ea580c',
      '--theme-primary': '#f97316',
      '--theme-primary-hover': '#ea580c',
      '--theme-text': '#fff7ed',
      '--theme-muted': '#fdba74',
    },
    fontClass: 'font-scifi',
    narrativeStyle: "Desperate, gritty, and resourceful. Focus on scarcity, danger, human nature, and the will to survive against all odds.",
    backgroundTemplate: "The meteor hit ten years ago. The dust blocked the sun. The zombies/monsters came next. You are a survivor in the wasteland. You have a [Bunker/Vehicle] and a few supplies. You hear a broadcast about a Safe Zone in the north. You must travel across the ruined continent, fighting off raiders and beasts, to find the last hope for humanity.",
    example: "The Geiger counter clicks rapidly. You pull your scarf up. 'Acid rain coming,' you mutter. You scramble under the rusted chassis of an old truck. Beside you, a mutated rat scuttles away. You check your ammo count: three bullets. Enough for two raiders and yourself. You close your eyes and listen to the rain sizzling on the metal above, dreaming of a blue sky you can barely remember."
  },
  patriotism: {
    name: "Patriotism",
    vars: {
      '--theme-bg': '#1e1b4b', // Dark Blue
      '--theme-surface': '#312e81',
      '--theme-surface-highlight': '#4338ca',
      '--theme-border': '#ef4444', // Red accent
      '--theme-primary': '#fbbf24', // Gold
      '--theme-primary-hover': '#f59e0b',
      '--theme-text': '#eef2ff',
      '--theme-muted': '#a5b4fc',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Grand, heroic, and self-sacrificing. Focus on duty, honor, defending the homeland, and collective spirit.",
    backgroundTemplate: "The enemy invaders have crossed the border. The capital is in panic. You are a [Soldier/General/Civilian] who refuses to flee. You rally a group of volunteers to hold the [Critical Pass/Bridge]. You are outnumbered ten to one. But behind you lies your home, your family, your country. You will not take a single step back.",
    example: "The flag is tattered, stained with smoke and blood, but it still flies. You look at the young faces around you—farmers, students, shopkeepers. They are scared, but they are standing. 'They may have tanks,' you shout, your voice rising above the artillery fire, 'but we have blood! We have bone! We are the wall!' A roar of defiance answers you. The enemy charges. You ready your rifle."
  },
  son_in_law: {
    name: "Son-in-Law",
    vars: {
      '--theme-bg': '#111827',
      '--theme-surface': '#1f2937',
      '--theme-surface-highlight': '#374151',
      '--theme-border': '#6b7280',
      '--theme-primary': '#22d3ee',
      '--theme-primary-hover': '#06b6d4',
      '--theme-text': '#f9fafb',
      '--theme-muted': '#9ca3af',
    },
    fontClass: 'font-sans',
    narrativeStyle: "Underestimated, patient, and eventually explosive. Focus on enduring humiliation, secret skills, and the ultimate reveal of true worth.",
    backgroundTemplate: "You are the live-in son-in-law of the wealthy [Family Name]. Your mother-in-law insults you, your wife is cold to you, and the relatives treat you like a servant. They don't know that you are actually the [Dragon Lord/Medical Saint] in hiding. You endure it for your wife's sake. But when they push you too far, the dragon will raise its head.",
    example: "'Wash my feet!' your mother-in-law demands, kicking the basin over. Water soaks your cheap trousers. The relatives laugh. You clench your fists, then relax them. 'Yes, Mother,' you say quietly. As you bend down, your phone buzzes. A text from the World Bank: 'Lord, your assets have been unfrozen. Balance: 10 Trillion.' You look up. The look in your eyes makes the room go cold."
  },
  white_moonlight: {
    name: "White Moonlight",
    vars: {
      '--theme-bg': '#0f172a',
      '--theme-surface': '#1e293b',
      '--theme-surface-highlight': '#334155',
      '--theme-border': '#94a3b8',
      '--theme-primary': '#e2e8f0', // White/Silver
      '--theme-primary-hover': '#cbd5e1',
      '--theme-text': '#f8fafc',
      '--theme-muted': '#94a3b8',
    },
    fontClass: 'font-serif',
    narrativeStyle: "Ethereal, pure, and tragic. Focus on memory, idealization, loss, and the haunting beauty of an unreachable love.",
    backgroundTemplate: "He is the Emperor/CEO, and he has everything. But his eyes are always sad. Because you, his White Moonlight, died/left years ago. He looks for you in every woman he meets. Now, you have returned/reincarnated, but you have lost your memory/changed your face. He hates you at first, not knowing you are the one he has been mourning for a lifetime.",
    example: "He grabs your chin, forcing you to look at the portrait on the wall. It is a painting of a girl in a white dress, laughing under a magnolia tree. 'You are nothing like her,' he hisses, his eyes full of pain. 'She was an angel. You are just a schemer.' You look at the painting. The girl has a mole under her left eye. Just like you. A sharp pain shoots through your head. A memory surfaces."
  },
  yandere: {
    name: "Yandere",
    vars: {
      '--theme-bg': '#000000',
      '--theme-surface': '#1a0505',
      '--theme-surface-highlight': '#330a0a',
      '--theme-border': '#ff0000', // Bright Red
      '--theme-primary': '#ff0000',
      '--theme-primary-hover': '#cc0000',
      '--theme-text': '#ffe4e6',
      '--theme-muted': '#fda4af',
    },
    fontClass: 'font-horror',
    narrativeStyle: "Obsessive, intense, and dangerous. Focus on possession, jealousy, extreme devotion, and the fine line between love and madness.",
    backgroundTemplate: "You saved [Name] when he was a child. You forgot about it. But he never did. He grew up twisting his love for you into a dark obsession. Now, he has kidnapped/trapped you. He treats you like a fragile doll. He will kill anyone who looks at you. He whispers sweet nothings while cleaning blood off his hands. 'You are mine,' he says. 'Only mine.'",
    example: "The chain on your ankle rattles as you try to move. The room is filled with your photos—hundreds of them. Sleeping, eating, walking. He enters with a tray of food. He smiles, a sweet, innocent smile that doesn't reach his dead eyes. 'I made your favorite,' he says softly. 'Why are you crying, my love? Are you trying to leave me again? I'll have to break your legs if you do that.'"
  }
};
