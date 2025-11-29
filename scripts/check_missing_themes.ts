
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const themesJsonPath = path.resolve(__dirname, '../src/locales/zh/themes.json');

const rawList = `《千秋》作者:梦溪石，《史上第一佛修》作者：青丘千叶，《图灵密码》作者：非天夜翔，《碎玉投珠》作者：北南，《权宦》作者：陈灯，《栖息之陆》作者：漫漫何其多，《黄金台》作者：苍梧宾白，《穿到明朝考科举》作者：五色龙章，《穿到古代当名士》作者：五色龙章，《提灯看刺刀》作者：淮上，《无双》作者：梦溪石，《帝师》作者：来自远方，《伪装学渣》作者:木瓜黄，《不准跟我说话》作者：三千大梦叙平生，《穿成校草前男友》作者：连朔，《某某》作者：木苏里，《不准影响我学习》作者：三千大梦叙平生，《你是不是喜欢我》：作者：吕天逸，《状元郎总是不及格[古穿今]》作者：公子于歌，《同桌你清醒一点》作者：一把杀猪刀，《一级律师》作者:木苏里，《破云》作者：淮上，《迪奥先生》作者：绿野千鹤，《默读》作者：priest，《安知我意》作者：北南，《金牌助理》作者：非天夜翔，《不死者》作者：淮上，.《快穿之打脸狂魔》作者：风流书呆，《追尾》作者：潭石，《影帝》作者：漫漫何其多，《全职高手》作者：蝴蝶蓝，《男神说他钢管直》作者：青云待雨时，《台风眼》作者：潭石，《沉舟》作者：楚寒衣青，《铜钱龛世》作者：木苏里，《军区大院》作者：泡泡雪儿，《盛宠巨星》作者：浩瀚，《将进酒》作者：唐酒卿，《谨言》作者：来自远方，《荒野之春》作者：blueky，《一剑霜寒》作者：笑语阑珊，《秋以为期》作者：桃千岁，《丧病大学 》作者：颜凉雨，《全球高考》作者：木苏里，《穿成作精后我怼天怼地无所不能 》作者：小猫不爱叫，《嫁给暴君后我每天都想守寡》，《反派师尊貌美如花》，《赘婿》，《乱世铜炉》，《厉害了我的原始人》，《窃位游戏》，《盗墓笔记》，《甄嬛传》，《鬼吹灯》，《大王饶命》，《史上最强赘婿》，《修真聊天群》，《网游之近战法师》，《余罪：我的刑侦笔记》，《全球高武》，《当个法师闹革命》，《原始战记》，《天启预报》，《大奉打更人》，《夜的命名术》，《三体》，《重生之似水流年》，《满朝文武都能听到我的心声》，《强者是怎样炼成的》，《鬼灭之刃》，《时光代理人》，《黑神话·悟空》，《迪迦奥特曼》，《捷德奥特曼》，《铠甲勇士》，《巴啦啦小魔仙》，《千与千寻》，《黑客帝国》，《星际穿越》，《阿凡达》，《肖申克的救赎》，《控方证人》，《我们的父辈》，《海绵宝宝》，《哆啦A梦》，《霸王别姬》，《辛德勒的名单》，《盗梦空间》，《泰坦尼克号》，《教父》，《乱世佳人》，《超人》，《蝙蝠侠》，《蜘蛛侠》，《复仇者联盟》`;

function parseTitles(text: string): string[] {
    // Split by comma or '，'
    const parts = text.split(/[,，]/);
    const titles: string[] = [];

    for (const part of parts) {
        // Extract content within 《》
        const match = part.match(/《(.*?)》/);
        if (match) {
            titles.push(match[1].trim());
        }
    }
    return titles;
}

async function checkMissing() {
    const themesJsonContent = fs.readFileSync(themesJsonPath, 'utf-8');
    const themesJson = JSON.parse(themesJsonContent);

    // Create a set of existing names (normalized)
    const existingNames = new Set<string>();
    for (const key in themesJson) {
        const name = themesJson[key].name;
        if (name) {
            existingNames.add(name.replace(/[《》]/g, '').trim());
            existingNames.add(name.trim());
        }
    }

    const requestedTitles = parseTitles(rawList);
    const missingTitles: string[] = [];

    for (const title of requestedTitles) {
        const normalizedTitle = title.trim();
        // Check if title exists (with or without book marks in the set, though we stripped them for comparison)
        if (!existingNames.has(normalizedTitle) && !existingNames.has(`《${normalizedTitle}》`)) {
             missingTitles.push(title);
        }
    }

    console.log(`Total requested: ${requestedTitles.length}`);
    console.log(`Missing count: ${missingTitles.length}`);
    console.log('Missing Titles:');
    console.log(JSON.stringify(missingTitles, null, 2));
}

checkMissing().catch(console.error);
