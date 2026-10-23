// vocabdata.js — Lug‘at uchun qo‘shimcha ma’lumot: inglizcha talaffuz (IPA, amerikancha) va rasm belgisi.
// Ma’nolar (o‘zbekcha) va misollar bu yerda EMAS — ular dars fayllaridan olinadi, shuning uchun ikki joyda nusxa bo‘lmaydi.
//
// Rasm haqida: katta rasm fayllari JS ichiga joylanmaydi. Har so‘zga bitta Unicode belgi (emoji) yoki raqam beriladi.
// Bu qurilmaning o‘z shriftidan chiziladi: internet kerak emas, litsenziya muammosi yo‘q, oflayn ishlaydi.
// Mavhum so‘zlar (masalan: of, very, because) uchun halol rasm yo‘q — ularga ilova chiroyli harfli kartochka chizadi.
//
// Format (har qator): inglizcha so‘z | IPA | rasm belgisi (bo‘sh bo‘lishi mumkin)
const RAW = `
hello|həˈloʊ|👋
hi|haɪ|🙋
good morning|ɡʊd ˈmɔːrnɪŋ|🌅
good afternoon|ɡʊd ˌæftərˈnuːn|☀️
good evening|ɡʊd ˈiːvnɪŋ|🌆
goodbye|ɡʊdˈbaɪ|
bye|baɪ|🤚
how are you|haʊ ɑːr ju|
fine|faɪn|👌
thank you|ˈθæŋk ju|🙏
nice to meet you|naɪs tə miːt ju|🤝
see you tomorrow|siː ju təˈmɑːroʊ|
name|neɪm|📛
my|maɪ|
your|jɔːr|
what|wʌt|❓
where|wer|📍
from|frʌm|
country|ˈkʌntri|🌍
city|ˈsɪti|🏙️
too|tuː|
meet|miːt|
alphabet|ˈælfəbet|🔤
letter|ˈletər|🅰️
spell|spel|✍️
how|haʊ|
please|pliːz|🥺
repeat|rɪˈpiːt|🔁
speak|spiːk|🗣️
slowly|ˈsloʊli|🐌
sorry|ˈsɑːri|😔
double|ˈdʌbəl|✌️
zero|ˈzɪroʊ|0️⃣
one|wʌn|1️⃣
two|tuː|2️⃣
three|θriː|3️⃣
four|fɔːr|4️⃣
five|faɪv|5️⃣
six|sɪks|6️⃣
seven|ˈsevən|7️⃣
eight|eɪt|8️⃣
nine|naɪn|9️⃣
ten|ten|🔟
eleven|ɪˈlevən|11
twelve|twelv|12
thirteen|ˌθɜːrˈtiːn|13
fourteen|ˌfɔːrˈtiːn|14
fifteen|ˌfɪfˈtiːn|15
sixteen|ˌsɪksˈtiːn|16
seventeen|ˌsevənˈtiːn|17
eighteen|ˌeɪˈtiːn|18
nineteen|ˌnaɪnˈtiːn|19
twenty|ˈtwenti|20
number|ˈnʌmbər|🔢
phone|foʊn|📱
phone number|foʊn ˈnʌmbər|☎️
I|aɪ|
you|ju|👤
old|oʊld|👴
year|jɪr|🗓️
live|lɪv|
in|ɪn|
student|ˈstuːdənt|🧑‍🎓
teacher|ˈtiːtʃər|🧑‍🏫
doctor|ˈdɑːktər|🧑‍⚕️
driver|ˈdraɪvər|
family|ˈfæməli|👨‍👩‍👧
mother|ˈmʌðər|👩
father|ˈfɑːðər|👨
brother|ˈbrʌðər|👦
sister|ˈsɪstər|👧
grandmother|ˈɡrænˌmʌðər|👵
grandfather|ˈɡrænˌfɑːðər|🧓
friend|frend|🧑‍🤝‍🧑
this|ðɪs|👇
his|hɪz|
her|hɜːr|
we|wiː|👫
they|ðeɪ|👥
and|ænd|➕
together|təˈɡeðər|👭
classmate|ˈklæsmeɪt|
neighbour|ˈneɪbər|🏘️
happy|ˈhæpi|😀
ready|ˈredi|✅
tired|ˈtaɪərd|😴
busy|ˈbɪzi|📋
not|nɑːt|🚫
yes|jes|👍
no|noʊ|❌
who|huː|🕵️
why|waɪ|🤔
because|bɪˈkɔːz|
today|təˈdeɪ|📆
home|hoʊm|🏡
school|skuːl|🏫
sad|sæd|😢
book|bʊk|📖
pen|pen|🖊️
bag|bæɡ|👜
table|ˈteɪbəl|🍽️
car|kɑːr|🚗
apple|ˈæpəl|🍎
orange|ˈɔːrɪndʒ|🍊
egg|eɡ|🥚
umbrella|ʌmˈbrelə|☂️
hour|ˈaʊər|⏳
that|ðæt|👉
these|ðiːz|
those|ðoʊz|
here|hɪr|📌
there|ðer|🔭
chair|tʃer|💺
door|dɔːr|🚪
window|ˈwɪndoʊ|
key|kiː|🔑
cup|kʌp|
box|bɑːks|📦
bus|bʌs|🚌
baby|ˈbeɪbi|👶
man|mæn|🧔
woman|ˈwʊmən|👩‍🦰
child|tʃaɪld|🧒
people|ˈpiːpəl|
watch|wɑːtʃ|⌚
class|klæs|
dish|dɪʃ|🥣
our|ˈaʊər|
their|ðer|
its|ɪts|
dog|dɔːɡ|🐶
cat|kæt|🐱
house|haʊs|🏠
room|ruːm|
notebook|ˈnoʊtbʊk|📓
pencil|ˈpensəl|✏️
street|striːt|🛣️
son|sʌn|👨‍👦
daughter|ˈdɔːtər|👩‍👧
parents|ˈperənts|👨‍👩‍👦
uncle|ˈʌŋkəl|🧔‍♂️
aunt|ænt|👩‍🦱
cousin|ˈkʌzən|
husband|ˈhʌzbənd|🤵
wife|waɪf|👰
grandparents|ˈɡrænˌperənts|👴👵
relative|ˈrelətɪv|🌳
have|hæv|🤲
has|hæz|
pet|pet|🐾
bike|baɪk|🚲
laptop|ˈlæptɑːp|💻
job|dʒɑːb|💼
idea|aɪˈdiːə|💡
question|ˈkwestʃən|🙋‍♀️
ticket|ˈtɪkɪt|🎫
problem|ˈprɑːbləm|⚠️
big|bɪɡ|🐘
small|smɔːl|🐜
new|nuː|🆕
tall|tɔːl|🦒
short|ʃɔːrt|📏
young|jʌŋ|
kind|kaɪnd|🤗
beautiful|ˈbjuːtɪfəl|🌺
good|ɡʊd|🌟
bad|bæd|👎
work|wɜːrk|🛠️
study|ˈstʌdi|🎓
go|ɡoʊ|
eat|iːt|🍴
drink|drɪŋk|🥤
read|riːd|👓
play|pleɪ|⚽
cook|kʊk|🍳
sleep|sliːp|🛌
every day|ˈevri deɪ|🔄
coffee|ˈkɔːfi|☕
tea|tiː|🍵
milk|mɪlk|🥛
walk|wɔːk|🚶‍♂️
drive|draɪv|🚘
listen|ˈlɪsən|👂
write|raɪt|📝
wash|wɑːʃ|🧼
buy|baɪ|🛒
music|ˈmjuːzɪk|🎵
when|wen|
morning|ˈmɔːrnɪŋ|🌄
evening|ˈiːvnɪŋ|🌇
breakfast|ˈbrekfəst|🥞
lunch|lʌntʃ|🥪
dinner|ˈdɪnər|🍝
early|ˈɜːrli|🐓
late|leɪt|🐢
start|stɑːrt|🏁
finish|ˈfɪnɪʃ|🏆
always|ˈɔːlweɪz|♾️
usually|ˈjuːʒuəli|
often|ˈɔːfən|
sometimes|ˈsʌmtaɪmz|
never|ˈnevər|⛔
rarely|ˈrerli|
how often|haʊ ˈɔːfən|
park|pɑːrk|⛲
cinema|ˈsɪnəmə|🎬
shop|ʃɑːp|🏪
thirty|ˈθɜːrti|30
forty|ˈfɔːrti|40
fifty|ˈfɪfti|50
sixty|ˈsɪksti|60
seventy|ˈsevənti|70
eighty|ˈeɪti|80
ninety|ˈnaɪnti|90
hundred|ˈhʌndrəd|💯
thousand|ˈθaʊzənd|1000
sum|sʌm|💵
how much|haʊ mʌtʃ|
cheap|tʃiːp|
expensive|ɪkˈspensɪv|💎
Monday|ˈmʌndeɪ|
Tuesday|ˈtuːzdeɪ|
Wednesday|ˈwenzdeɪ|
Thursday|ˈθɜːrzdeɪ|
Friday|ˈfraɪdeɪ|
Saturday|ˈsætərdeɪ|
Sunday|ˈsʌndeɪ|
week|wiːk|🗒️
weekend|ˈwiːkend|🏖️
month|mʌnθ|🌙
date|deɪt|📅
January|ˈdʒænjueri|
February|ˈfebrueri|
March|mɑːrtʃ|
April|ˈeɪprəl|
May|meɪ|
June|dʒuːn|
July|dʒuˈlaɪ|
August|ɔːˈɡʌst|
September|sepˈtembər|
October|ɑːkˈtoʊbər|
November|noʊˈvembər|
December|dɪˈsembər|
time|taɪm|🕒
clock|klɑːk|🕰️
minute|ˈmɪnɪt|⏱️
o’clock|əˈklɑːk|🕐
half|hæf|
quarter|ˈkwɔːrtər|
past|pæst|⏪
noon|nuːn|🕛
midnight|ˈmɪdnaɪt|🌃
what time|wʌt taɪm|⏰
get up|ɡet ʌp|
bed|bed|🛏️
lamp|læmp|
sofa|ˈsoʊfə|🛋️
computer|kəmˈpjuːtər|🖥️
picture|ˈpɪktʃər|🖼️
flower|ˈflaʊər|🌸
tree|triː|🌲
village|ˈvɪlɪdʒ|🌾
river|ˈrɪvər|🏞️
bridge|brɪdʒ|🌉
on|ɑːn|
under|ˈʌndər|
next to|ˈnekst tuː|
behind|bɪˈhaɪnd|
in front of|ɪn ˈfrʌnt ʌv|
between|bɪˈtwiːn|
near|nɪr|
shelf|ʃelf|📚
floor|flɔːr|
wall|wɔːl|🧱
kitchen|ˈkɪtʃən|👨‍🍳
bedroom|ˈbedruːm|
bathroom|ˈbæθruːm|🛁
living room|ˈlɪvɪŋ ruːm|📺
garden|ˈɡɑːrdən|🌻
balcony|ˈbælkəni|
fridge|frɪdʒ|🧊
carpet|ˈkɑːrpɪt|🧶
curtain|ˈkɜːrtən|
flat|flæt|🏢
can|kæn|💪
can’t|kænt|🙅
swim|swɪm|🏊
run|rʌn|🏃
sing|sɪŋ|🎤
dance|dæns|💃
ride|raɪd|🐎
fly|flaɪ|✈️
well|wel|😊
fast|fæst|⚡
excuse me|ɪkˈskjuːs mi|🙇
help|help|🆘
open|ˈoʊpən|🔓
close|kloʊz|🔒
borrow|ˈbɑːroʊ|
pass|pæs|
of course|əv kɔːrs|
here you are|hɪr ju ɑːr|
would like|wʊd laɪk|
let’s|lets|🙌
you’re welcome|jʊr ˈwelkəm|😉
bread|bred|🍞
rice|raɪs|🍚
meat|miːt|🥩
chicken|ˈtʃɪkɪn|🍗
fish|fɪʃ|🐟
soup|suːp|🍲
salad|ˈsæləd|🥗
water|ˈwɔːtər|💧
juice|dʒuːs|🧃
fruit|fruːt|🍇
plov|plɔːv|🍛
like|laɪk|
favourite|ˈfeɪvərɪt|💖
some|sʌm|
any|ˈeni|
a lot of|ə lɑːt əv|
sugar|ˈʃʊɡər|🍬
salt|sɔːlt|🧂
butter|ˈbʌtər|
cheese|tʃiːz|🧀
tomato|təˈmeɪtoʊ|🍅
potato|pəˈteɪtoʊ|🥔
onion|ˈʌnjən|🧅
menu|ˈmenjuː|📜
waiter|ˈweɪtər|
order|ˈɔːrdər|🧾
bill|bɪl|💳
hungry|ˈhʌŋɡri|🤤
thirsty|ˈθɜːrsti|🥵
delicious|dɪˈlɪʃəs|😋
restaurant|ˈrestərɑːnt|🥘
dessert|dɪˈzɜːrt|🍰
enjoy|ɪnˈdʒɔɪ|🥳
many|ˈmeni|
much|mʌtʃ|
kilo|ˈkiːloʊ|⚖️
litre|ˈliːtər|
bottle|ˈbɑːtəl|🍾
packet|ˈpækɪt|🛍️
market|ˈmɑːrkɪt|🧺
price|praɪs|🏷
change|tʃeɪndʒ|
customer|ˈkʌstəmər|
bank|bæŋk|🏦
hospital|ˈhɑːspɪtəl|🏥
pharmacy|ˈfɑːrməsi|💊
library|ˈlaɪbreri|
museum|mjuˈziːəm|🏛️
supermarket|ˈsuːpərˌmɑːrkɪt|🏬
hotel|hoʊˈtel|🏨
station|ˈsteɪʃən|🚉
mosque|mɑːsk|🕌
theatre|ˈθiːətər|🎭
left|left|⬅️
right|raɪt|➡️
straight|streɪt|⬆️
turn|tɜːrn|↪️
corner|ˈkɔːrnər|↩️
opposite|ˈɑːpəzɪt|↔️
far|fɑːr|
map|mæp|🗺️
crossroads|ˈkrɔːsroʊdz|🔀
traffic light|ˈtræfɪk laɪt|🚦
train|treɪn|🚆
taxi|ˈtæksi|🚕
metro|ˈmetroʊ|🚇
plane|pleɪn|🛩️
airport|ˈerpɔːrt|🛬
take|teɪk|
by|baɪ|
arrive|əˈraɪv|🛎️
leave|liːv|
stop|stɑːp|🛑
now|naʊ|
sit|sɪt|🪑
stand|stænd|🧍
wait|weɪt|⌛
look|lʊk|👀
talk|tɔːk|💬
laugh|læf|😂
call|kɔːl|📞
carry|ˈkæri|🎒
smile|smaɪl|🙂
at the moment|æt ðə ˈmoʊmənt|
right now|raɪt naʊ|
this week|ðɪs wiːk|
tonight|təˈnaɪt|
still|stɪl|⏸️
visit|ˈvɪzɪt|
travel|ˈtrævəl|🧭
paint|peɪnt|🎨
draw|drɔː|🖍️
build|bɪld|🏗️
weather|ˈweðər|🌦️
sunny|ˈsʌni|🌞
cloudy|ˈklaʊdi|☁️
rainy|ˈreɪni|🌧️
snowy|ˈsnoʊi|❄️
windy|ˈwɪndi|💨
hot|hɑːt|🔥
cold|koʊld|🥶
warm|wɔːrm|🧣
wear|wer|👗
shirt|ʃɜːrt|👔
jacket|ˈdʒækɪt|🧥
coat|koʊt|
hat|hæt|🎩
shoes|ʃuːz|👟
yesterday|ˈjestərdeɪ|⏮️
ago|əˈɡoʊ|
last night|læst naɪt|🌌
last year|læst jɪr|
born|bɔːrn|🍼
then|ðen|
childhood|ˈtʃaɪldhʊd|🧸
holiday|ˈhɑːlədeɪ|🏝️
party|ˈpɑːrti|🎉
wedding|ˈwedɪŋ|💒
ask|æsk|
answer|ˈænsər|
stay|steɪ|🏕️
need|niːd|
want|wɑːnt|🤩
love|lʌv|❤️
clean|kliːn|🧹
use|juːz|🔧
invite|ɪnˈvaɪt|💌
try|traɪ|🧪
see|siː|👁️
make|meɪk|🔨
come|kʌm|
get|ɡet|📥
give|ɡɪv|🎁
say|seɪ|🗨️
tell|tel|📢
find|faɪnd|🔍
think|θɪŋk|💭
know|noʊ|🧠
did|dɪd|
last week|læst wiːk|
last month|læst mʌnθ|
last weekend|læst ˈwiːkend|
first|fɜːrst|🥇
next|nekst|⏭️
after|ˈæftər|
before|bɪˈfɔːr|
finally|ˈfaɪnəli|
all day|ɔːl deɪ|🌤️
tomorrow|təˈmɑːroʊ|
next week|nekst wiːk|
next year|nekst jɪr|
plan|plæn|🧩
soon|suːn|🔜
later|ˈleɪtər|🕓
future|ˈfjuːtʃər|🔮
dream|driːm|🌠
maybe|ˈmeɪbi|🤷
decide|dɪˈsaɪd|
`;

const clean = (s) => s.replace(/‍$/u, "").replace(/️/g, "️").trim();
export const norm = (en) => String(en).toLowerCase().replace(/[’‘`]/g, "'").trim();

/** en (kichik harf) → { ipa, icon } */
export const VD = new Map();
for (const line of RAW.split("\n")) {
  if (!line.trim()) continue;
  const [en, ipa, icon] = line.split("|");
  VD.set(norm(en), { ipa: (ipa || "").trim(), icon: clean(icon || "") });
}

export function vdata(v) { return VD.get(norm(v.en)) || { ipa: "", icon: "" }; }
