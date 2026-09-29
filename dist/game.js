export const RESOURCE_NAMES={shell:'贝币',wood:'浮木',star:'星屑'};
export const LOCATIONS=[
 {id:'harbor',name:'灯塔港',en:'LANTERN HARBOR',subtitle:'所有旅途，都从一盏灯开始。',image:'harbor.webp',need:0,icon:'anchor',weather:'海雾轻柔',desc:'海风把第一封信送到了你的窗前。'},
 {id:'forest',name:'听风林',en:'WHISPERING WOODS',subtitle:'风经过树梢时，会念出谁的名字？',image:'forest.webp',need:1,icon:'leaf',weather:'萤火微光',desc:'在会说话的树林，寻找一位等信的人。'},
 {id:'bay',name:'沉钟湾',en:'THE SUNKEN BELL',subtitle:'潮水记得，陆地已经忘记的事。',image:'harbor.webp',need:2,icon:'waves',weather:'退潮时分',desc:'一口沉入海底的钟，仍在准时报时。'},
 {id:'stars',name:'星眠台',en:'SLEEPING STARS',subtitle:'有些星光，走了很远才抵达。',image:'observatory.webp',need:3,icon:'star',weather:'星河澄澈',desc:'旧天文台里，藏着寄给未来的答案。'},
 {id:'light',name:'无名灯塔',en:'THE LAST LIGHT',subtitle:'请替这个世界，再亮一盏灯。',image:'harbor.webp',need:4,icon:'sun',weather:'晨光将至',desc:'航线的终点，也可以是另一个起点。'}
];
export const LETTERS=[
 {id:'first',name:'一封没有地址的信',from:'灯塔港 · 守灯人',mark:'01',body:'致下一位邮差：\n\n雾来以后，大家开始忘记回家的路。我想，或许不是路消失了，只是再也没有人说「我在等你」。\n\n请把这几封信送出去吧。第一封，交给听风林里种树的姑娘。她总把想念藏在树洞里。\n\n小船叫晚安号。它不快，却从未错过一个需要靠岸的人。\n\n——一位想早点回家的守灯人'},
 {id:'forest',name:'给十年后的自己',from:'听风林 · 阿榆',mark:'02',body:'十年后的阿榆：\n\n你有没有把那棵歪歪扭扭的树种活？有没有离开这座岛？没有也没关系。\n\n小时候以为，长大就是要去很远的地方。现在我觉得，能把一件小事好好做完，也很了不起。\n\n如果你仍然会因为春天的第一片叶子高兴，就不算辜负我。\n\n——还没长大的你'},
 {id:'bay',name:'潮水退去之后',from:'沉钟湾 · 钟叔',mark:'03',body:'亲爱的孩子：\n\n你总问，钟沉了，为什么还要等它响。\n\n因为你母亲说过，等潮水最安静的时候，她会听见。我后来才明白，她听的不是钟，是有人还愿意为她敲钟。\n\n你不用赶回来。去看你想看的海。这里的灯，我会一直留着。\n\n——父亲'},
 {id:'stars',name:'寄给每一个路过的人',from:'星眠台 · 星图师',mark:'04',body:'陌生的朋友：\n\n这不是求救信，也不是藏宝图。\n\n我花了一生寻找雾海的边界，最后发现，每一盏为别人亮起的灯，都让世界变大一点。守灯人不是什么职务。它只是一个愿意说「我在这里」的人。\n\n灯塔的钥匙从来都不在我手里。它在那些被你认真听完的故事里。\n\n如果你走到了这里，那么——欢迎回家。'}
];
export const RELICS={shell:{name:'发光的海螺',desc:'贴近耳边，能听见还没发生的潮汐。',icon:'waves'},leaf:{name:'不会枯萎的叶子',desc:'阿榆把整个春天夹进了信封。',icon:'leaf'},bell:{name:'小小的铜钟',desc:'有些回应，不需要很响。',icon:'bell'},chart:{name:'手绘星图',desc:'地图的边缘写着：迷路也没关系。',icon:'star'},ticket:{name:'旧船票',desc:'目的地被划掉了，改成了「你想去的地方」。',icon:'ticket'},feather:{name:'银色羽毛',desc:'船上的海鸥留下了一份房租。',icon:'feather'}};
export const SCENES={
 harbor:[
  {eyebrow:'序章 · 一封迟到的信',title:'海风敲了敲你的窗',text:['傍晚，一封沾着海盐的信滑进了门缝。信封上没有名字，只画着一座熄灭的灯塔。','你推开窗。码头边停着一艘小木船，船头歪歪扭扭地写着「晚安号」。一只白色海鸥站在船舷上，像是已经等了你很久。'],quote:'「如果你也不知道要去哪里，就先替我送一封信吧。」',choices:[{label:'拆开这封没有地址的信',hint:'听听故事的开头',result:'信纸上留下的不是地址，而是一条通往听风林的航线。你决定去看看。',give:{star:2},kind:1},{label:'先和船上的海鸥打个招呼',hint:'认识你的第一位旅伴',result:'海鸥歪了歪头，把一枚亮晶晶的海螺推到你面前。你给它起名叫「点点」。',give:{shell:8},relic:'shell',kind:1}]},
  {eyebrow:'序章 · 晚安号',title:'一艘船，一点出发的勇气',text:['甲板有点旧，船舱却很干净。桌上放着一张手绘航图、一壶温茶，还有四封没寄出的信。','码头老人替你解开缆绳。他说，雾海没有风暴预报，但总有人会为晚归的船留灯。'],choices:[{label:'整理邮袋，带上温茶',hint:'贝币 +12 · 浮木 +4',result:'你把信一封封放好。第一站：听风林。海鸥点点轻轻叫了一声，仿佛在说「我们走吧」。',give:{shell:12,wood:4},letter:'first',relic:'shell',complete:true},{label:'再听老人讲一个海上的故事',hint:'星屑 +3 · 浮木 +4',result:'「以前岛与岛之间没有雾，是人们忘了互相写信。」老人笑着摆摆手。你记住了这句话。',give:{star:3,wood:4},letter:'first',relic:'shell',kind:1,complete:true}]}
 ],
 forest:[
  {eyebrow:'第一章 · 树洞里的春天',title:'森林在轻轻念你的名字',text:['船靠岸时，林间亮起了萤火。树枝上系满褪色的丝带，每一条都写着一个愿望。','一个姑娘正蹲在树下，给一株小小的树苗撑伞。没有下雨，她说，是怕夜里的露水太冷。'],quote:'「给我的信？可是……我已经很久没有收到信了。」',choices:[{label:'把信交给她，安静地等一会儿',hint:'她或许需要一点时间',result:'她读得很慢，眼睛却一点点亮起来。这是一封她十年前寄给自己的信。',kind:1,give:{star:2}},{label:'帮她把树苗的伞扶正',hint:'浮木 −2 · 星屑 +4',cost:{wood:2},result:'你用木条支好小伞。她把信摊在膝上，邀你一起看看，十年前的小女孩在想什么。',kind:1,give:{star:4}}]},
  {eyebrow:'第一章 · 阿榆的愿望',title:'有些愿望，长得比人慢',text:['「我以前说，十年以后要看遍所有的海。」阿榆笑了笑，「结果只种活了这一片树林。」','风掠过枝头，整座森林沙沙作响。你突然觉得，这声音很像鼓掌。'],choices:[{label:'告诉她：这一片树林已经很了不起',hint:'收集回忆 · 不会枯萎的叶子',result:'阿榆挑了一片最漂亮的叶子夹进信里。她说，沉钟湾有个人也在等信，能不能顺路去看看。',letter:'forest',relic:'leaf',give:{wood:8,shell:15},kind:1,complete:true},{label:'邀她登船，看看林子另一边的海',hint:'收集回忆 · 不会枯萎的叶子',result:'你们绕着岛航行了一圈。她第一次看见，自己种的树林从海上看，像一颗绿色的心。下一站，沉钟湾。',letter:'forest',relic:'leaf',give:{wood:6,star:4},complete:true}]}
 ],
 bay:[
  {eyebrow:'第二章 · 潮汐的回音',title:'那口钟，依然有人在等',text:['退潮的海湾露出了铺满贝壳的石阶。一个白发老人每天都坐在这里，看着水面。','他说，海下有一座旧钟楼。钟声停下的那天，妻子乘船离开，再也没回来。'],quote:'「他们叫我别等了。可我不是在等，我是在记得。」',choices:[{label:'坐在石阶上，陪他听一会儿潮声',hint:'有时候，陪伴就是回信',result:'你们没有说话。潮水退得很远时，石阶下露出一枚旧铜钟，安静地泛着光。',give:{star:3},kind:1},{label:'用浮木搭一条通往旧钟楼的小桥',hint:'浮木 −5 · 贝币 +20',cost:{wood:5},result:'小桥搭好了。钟叔第一次走近那座钟楼，在残墙上找到了妻子刻下的名字。',give:{shell:20},kind:1}]},
  {eyebrow:'第二章 · 没有写完的回信',title:'把想念，交给潮水',text:['信是钟叔的孩子寄来的。孩子说，自己在很远的城市也听到了海浪声。','钟叔摸了摸口袋里的小铜钟。「原来离开这里，也可以一直记得这里。」他请你帮忙写一封回信。'],choices:[{label:'写下：去看你想看的海',hint:'收集回忆 · 小小的铜钟',result:'钟叔笑着把铜钟交给你。「替我带到更远的地方吧。」雾里亮起通往星眠台的航标。',letter:'bay',relic:'bell',give:{wood:6,star:4},complete:true},{label:'写下：这里永远给你留着一盏灯',hint:'收集回忆 · 小小的铜钟',result:'钟叔把最后一个句号写得很重。海风吹响了铜钟，像是一封刚刚抵达的回信。',letter:'bay',relic:'bell',give:{shell:20,star:4},kind:1,complete:true}]}
 ],
 stars:[
  {eyebrow:'第三章 · 星光的来处',title:'寄往昨天的星光',text:['天文台的门没有锁。桌上摊着一幅画了许多年的星图，每颗星旁都写着一座岛的名字。','年轻的星图师在修一架旧望远镜。「今晚能看到一颗特别的星。它发出的光，正好走了你年纪那么久。」'],choices:[{label:'帮他修好望远镜',hint:'浮木 −4 · 星屑 +6',cost:{wood:4},result:'镜筒重新对准了天空。那束走了很久的光，终于被你们看见。',give:{star:6},kind:1},{label:'坐在屋顶，等那颗星出现',hint:'星屑 +3',result:'你们一直等到云散。原来有些事情，不需要加速，也会在自己的时间里发生。',give:{star:3}}]},
  {eyebrow:'第三章 · 最后一封信',title:'雾海从来没有边界',text:['星图师拿出最后一封信。收件人写着「每一个路过的人」。','「岛屿之间的雾不是墙，是还没有讲完的故事。」他把星图递给你。图的中央，是你在第一封信上见过的灯塔。'],choices:[{label:'收好星图，去点亮最后的灯塔',hint:'收集回忆 · 手绘星图',result:'四封信，四个故事，终于连成了一条航线。无名灯塔就在晨雾的后面。',letter:'stars',relic:'chart',give:{wood:8,star:5},complete:true},{label:'在星图上，画上晚安号的位置',hint:'收集回忆 · 手绘星图',result:'你画了一艘小船。星图师说：「你看，你也是这片海的一部分。」灯塔的航路亮起来了。',letter:'stars',relic:'chart',give:{wood:8,star:5},kind:1,complete:true}]}
 ],
 light:[
  {eyebrow:'终章 · 写给明天',title:'一盏灯，也是一封回信',text:['石阶尽头，灯塔的门缓缓打开。这里没有失踪的守灯人，只有一张空椅子，和一盏等待点亮的灯。','你把海螺、树叶、铜钟和星图放在窗前。原来一路上收到的回忆，就是重新点亮它的火种。'],quote:'「这一次，你想把灯光留在哪里？」',choices:[{label:'修复灯芯，成为新的守灯人',hint:'浮木 −12 · 星屑 −8 · 结局「等你靠岸」',cost:{wood:12,star:8},result:'你点亮了灯。雾海深处，一盏又一盏微小的灯回应着你。从此，迷路的人知道，总有人在等他们靠岸。',ending:'home',complete:true,kind:1},{label:'把灯装上晚安号，继续去送信',hint:'浮木 −12 · 星屑 −8 · 结局「灯随你远行」',cost:{wood:12,star:8},result:'灯塔成了一艘会移动的小船。哪里有人等待，灯光就会到哪里。你把下一封信放进邮袋，驶向了地图之外。',ending:'sail',complete:true}]}
 ]
};
export const AMBIENT=[
 {title:'海鸥的房租',text:'点点从海面叼来一枚贝币，郑重地放在甲板上。看来它也觉得，搭船不能总是白搭。',give:{shell:10},relic:'feather'},
 {title:'瓶子里的晚安',text:'你捞起一只漂流瓶。里面没有求救信，只有一句：「今天辛苦了，早点睡。」你莫名笑了起来。',give:{star:3}},
 {title:'一段好木头',text:'潮水带来一块被打磨得很光滑的浮木。它像是走过了很远的地方，终于愿意歇一歇。',give:{wood:7}},
 {title:'云的影子',text:'一朵云在船边停了一小会儿。你没有拍照，只是认真看了看。这样的下午，也值得记下来。',give:{star:2,shell:5}},
 {title:'藏在夹缝里的旧船票',text:'你在码头的石缝里发现了一张旧船票。背面有人写着：「愿你每一次出发，都是因为期待。」',give:{shell:6},relic:'ticket'},
 {title:'夜航的小集市',text:'渔船擦肩而过，船主送你几块木料。你替他把一声问候带给了港口，交易就算完成了。',give:{wood:5,shell:5}}
];
export const UPGRADES=[{id:'cabin',name:'温暖船舱',desc:'舒适一点，才能走得远一点。每级精力上限 +2。',icon:'home',cost:{wood:10,shell:20}}, {id:'net',name:'拾光渔网',desc:'捞起海上遗落的宝物。每级探索物资收益 +25%。',icon:'box',cost:{wood:8,shell:18}}, {id:'lantern',name:'星屑航灯',desc:'把微光留在船头。每级探索额外获得 1 星屑。',icon:'sun',cost:{wood:8,star:5}}];
export const initialState=()=>({version:1,location:'harbor',day:1,turn:0,energy:6,resources:{shell:36,wood:10,star:3},progress:{harbor:0,forest:0,bay:0,stars:0,light:0},completed:[],letters:[],relics:[],upgrades:{cabin:0,net:0,lantern:0},kindness:0,ending:null,endings:[],infinite:false,explorations:0,log:[{day:1,title:'旅途开始',text:'你接过晚安号的船钥匙。海风很轻，今天适合出发。'}],result:null});
export const maxEnergy=s=>6+s.upgrades.cabin*2;
export const sceneFor=s=>SCENES[s.location][s.progress[s.location]];
export const unlocked=(s,l)=>s.letters.length>=l.need;
export const affordable=(s,cost={})=>s.infinite||Object.entries(cost).every(([k,v])=>s.resources[k]>=v);
export function spend(s,cost={}){if(!s.infinite)Object.entries(cost).forEach(([k,v])=>s.resources[k]-=v);}
export function give(s,values={}){Object.entries(values).forEach(([k,v])=>s.resources[k]+=v);}
export function log(s,title,text){s.log.unshift({day:s.day,title,text});s.log=s.log.slice(0,100);}
export function tick(s){s.turn++;if(s.turn%6===0)s.day++;}
function addUnique(a,v){if(v&&!a.includes(v))a.push(v);}
export function act(s,action,payload){
 if(action==='continue'){s.result=null;return {ok:true};}
 if(action==='toggle'){s.infinite=!s.infinite;return {ok:true,message:s.infinite?'测试模式已开启：资源与精力不再消耗':'已回到普通模式，原有物资完整保留'};}
 if(action==='rest'){s.energy=maxEnergy(s);s.day++;s.turn=0;log(s,'船舱里的一觉','一壶热茶，一阵海风。醒来时，精力已经恢复。');s.result=null;return {ok:true,message:'晚安，邮差。精力已恢复，新的一天开始了。'};}
 if(action==='travel'){
  const dest=LOCATIONS.find(x=>x.id===payload);if(!dest||!unlocked(s,dest))return {ok:false,message:'先完成前一座岛的故事，航路就会显现。'};
  if(s.location===dest.id)return {ok:true};
  if(!s.infinite&&s.energy<1)return {ok:false,message:'有点累了，先回船舱休息吧。'};
  if(!s.infinite)s.energy--;s.location=dest.id;s.result=null;tick(s);log(s,'抵达'+dest.name,dest.subtitle);return {ok:true,message:'晚安号已停靠'+dest.name};
 }
 if(action==='choice'){
  if(s.result)return {ok:false,message:'先收好这段回忆，再继续吧。'};
  const scene=sceneFor(s),choice=scene?.choices[payload];if(!choice)return {ok:false};
  if(!affordable(s,choice.cost))return {ok:false,message:'物资不足。可以沿岸探索，或开启无限物资测试。'};
  spend(s,choice.cost);give(s,choice.give);s.kindness+=choice.kind||0;addUnique(s.letters,choice.letter);addUnique(s.relics,choice.relic);s.progress[s.location]++;tick(s);
  if(choice.complete)addUnique(s.completed,s.location);
  if(choice.ending){s.ending=choice.ending;addUnique(s.endings,choice.ending);}
  s.result={title:choice.ending?'灯亮了。':choice.complete?'这一封信，抵达了。':'故事有了新的回音',text:choice.result,give:choice.give||{},relic:choice.relic,letter:choice.letter,ending:choice.ending};log(s,scene.title,choice.result);return {ok:true};
 }
 if(action==='explore'){
  if(!s.infinite&&s.energy<1)return {ok:false,message:'精力不足，免费休息后就能继续探索。'};
  if(!s.infinite)s.energy--;const event=AMBIENT[s.explorations%AMBIENT.length];s.explorations++;tick(s);
  const rewards=Object.fromEntries(Object.entries(event.give).map(([k,v])=>[k,Math.ceil(v*(1+s.upgrades.net*.25))]));rewards.star=(rewards.star||0)+s.upgrades.lantern;if(!rewards.star)delete rewards.star;
  give(s,rewards);addUnique(s.relics,event.relic);s.result={title:event.title,text:event.text,give:rewards,relic:event.relic};log(s,event.title,event.text);return {ok:true};
 }
 if(action==='upgrade'){
  const item=UPGRADES.find(x=>x.id===payload);if(!item||s.upgrades[payload]>=3)return {ok:false,message:'这项设施已经升到满级了。'};
  const cost=Object.fromEntries(Object.entries(item.cost).map(([k,v])=>[k,v*(s.upgrades[payload]+1)]));
  if(!affordable(s,cost))return {ok:false,message:'物资还不够，去沿岸探索会有收获。'};
  spend(s,cost);s.upgrades[payload]++;if(payload==='cabin')s.energy=Math.min(maxEnergy(s),s.energy+2);log(s,'升级 · '+item.name,'晚安号又变得舒适了一点。');return {ok:true,message:item.name+'已升至 '+s.upgrades[payload]+' 级'};
 }
 if(action==='revisit'){if(!s.ending)return {ok:false};s.location='light';s.progress.light=0;s.completed=s.completed.filter(x=>x!=='light');s.result=null;return {ok:true};}
 return {ok:false};
}
