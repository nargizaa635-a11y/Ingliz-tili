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
all night|ɔːl ˈnaɪt|
at that time|ət ðæt ˈtaɪm|
noise|nɔɪz|
quietly|ˈkwaɪətli|
news|njuːz|
loudly|ˈlaʊdli|
crowded|ˈkraʊdɪd|
whisper|ˈwɪspər|
noisy|ˈnɔɪzi|
alone|əˈləʊn|
outside|ˌaʊtˈsaɪd|
meeting|ˈmiːtɪŋ|
shout|ʃaʊt|
complain|kəmˈpleɪn|
argue|ˈɑːɡjuː|
cry|kraɪ|
suddenly|ˈsʌdənli|
ring|rɪŋ|
knock|nɒk|
drop|drɒp|
slip|slɪp|
spill|spɪl|
lightning|ˈlaɪtnɪŋ|
wallet|ˈwɒlɪt|
get dressed|ɡet drest|
pack|pæk|
luggage|ˈlʌɡɪdʒ|
journey|ˈdʒɜːni|
afterwards|ˈɑːftəwədz|
meanwhile|ˈmiːnwaɪl|
at last|ət lɑːst|
immediately|ɪˈmiːdiətli|
habit|ˈhæbɪt|
toy|tɔɪ|
strict|strɪkt|
shy|ʃaɪ|
grow up|ɡrəʊ ʌp|
pocket money|ˈpɒkɪt ˈmʌni|
anymore|ˌeniˈmɔː|
collect|kəˈlekt|
promise|ˈprɒmɪs|
mend|mend|
probably|ˈprɒbəbli|
definitely|ˈdefɪnətli|
perhaps|pəˈhæps|
remind|rɪˈmaɪnd|
deliver|dɪˈlɪvə|
repair|rɪˈpeə|
worry|ˈwʌri|
cancel|ˈkænsl|
postpone|pəʊstˈpəʊn|
hurry|ˈhʌri|
trust|trʌst|
refuse|rɪˈfjuːz|
delay|dɪˈleɪ|
damage|ˈdæmɪdʒ|
forecast|ˈfɔːkɑːst|
temperature|ˈtemprətʃə|
intend|ɪnˈtend|
prepare|prɪˈpeə|
storm|stɔːm|
fuel|ˈfjuːəl|
likely|ˈlaɪkli|
decline|dɪˈklaɪn|
appointment|əˈpɔɪntmənt|
interview|ˈɪntəvjuː|
schedule|ˈʃedjuːl|
dentist|ˈdentɪst|
deadline|ˈdedlaɪn|
colleague|ˈkɒliːɡ|
arrange|əˈreɪndʒ|
pick up|pɪk ʌp|
narrow|ˈnærəʊ|
wide|waɪd|
thick|θɪk|
steep|stiːp|
tidy|ˈtaɪdi|
quiet|ˈkwaɪət|
fresh|freʃ|
loud|laʊd|
dangerous|ˈdeɪndʒərəs|
reliable|rɪˈlaɪəbl|
affordable|əˈfɔːdəbl|
boring|ˈbɔːrɪŋ|
valuable|ˈvæljuəbl|
convenient|kənˈviːniənt|
comfortable|ˈkʌmftəbl|
modern|ˈmɒdn|
huge|hjuːdʒ|
tiny|ˈtaɪni|
remote|rɪˈməʊt|
awful|ˈɔːfl|
excellent|ˈeksələnt|
distance|ˈdɪstəns|
speed|spiːd|
record|ˈrekɔːd|
similar|ˈsɪmələr|
equal|ˈiːkwəl|
nearly|ˈnɪəli|
exactly|ɪɡˈzæktli|
twice|twaɪs|
same|seɪm|
difference|ˈdɪfrəns|
compare|kəmˈpeər|
amount|əˈmaʊnt|
plenty|ˈplenti|
queue|kjuː|
pile|paɪl|
stock|stɒk|
bucket|ˈbʌkɪt|
pallet|ˈpælɪt|
forklift|ˈfɔːklɪft|
several|ˈsevrəl|
spare|speə|
leftover|ˈleftˌəʊvə|
extra|ˈekstrə|
spoonful|ˈspuːnfʊl|
slightly|ˈslaɪtli|
lack|læk|
handful|ˈhændfʊl|
loose|luːs|
rough|rʌf|
fragile|ˈfrædʒaɪl|
capacity|kəˈpæsəti|
afford|əˈfɔːd|
spacious|ˈspeɪʃəs|
spoil|spɔɪl|
overweight|ˌəʊvəˈweɪt|
advice|ədˈvaɪs|
suggest|səˈdʒest|
recommend|ˌrekəˈmend|
sensible|ˈsensəbl|
headache|ˈhedeɪk|
backache|ˈbækeɪk|
rest|rest|
regularly|ˈreɡjələli|
rule|ruːl|
safety|ˈseɪfti|
helmet|ˈhelmɪt|
obey|əˈbeɪ|
forbidden|fəˈbɪdn|
smoke|sməʊk|
exit|ˈeɡzɪt|
warning|ˈwɔːnɪŋ|
uniform|ˈjuːnɪfɔːm|
licence|ˈlaɪsns|
shift|ʃɪft|
overtime|ˈəʊvətaɪm|
inspection|ɪnˈspekʃn|
customs|ˈkʌstəmz|
optional|ˈɒpʃənl|
compulsory|kəmˈpʌlsəri|
permission|pəˈmɪʃn|
hold|həʊld|
lend|lend|
request|rɪˈkwest|
polite|pəˈlaɪt|
favour|ˈfeɪvə|
available|əˈveɪləbl|
assist|əˈsɪst|
unload|ʌnˈləʊd|
sort|sɔːt|
weigh|weɪ|
shipment|ˈʃɪpmənt|
fix|fɪks|
lose|luːz|
scan|skæn|
label|ˈleɪbl|
experience|ɪkˈspɪəriəns|
abroad|əˈbrɔːd|
occasionally|əˈkeɪʒənəli|
climb|klaɪm|
taste|teɪst|
adventure|ədˈventʃə|
countless|ˈkaʊntləs|
lucky|ˈlʌki|
invoice|ˈɪnvɔɪs|
print|prɪnt|
submit|səbˈmɪt|
confirm|kənˈfɜːm|
reply|rɪˈplaɪ|
reminder|rɪˈmaɪndə|
update|ʌpˈdeɪt|
reschedule|ˌriːˈʃedjuːl|
teammate|ˈtiːmmeɪt|
roommate|ˈruːmmeɪt|
anniversary|ˌænɪˈvɜːsəri|
retire|rɪˈtaɪə|
decade|ˈdekeɪd|
supervisor|ˈsuːpəvaɪzə|
trolley|ˈtrɒli|
ladder|ˈlædə|
container|kənˈteɪnə|
declare|dɪˈkleə|
contract|ˈkɒntrækt|
complaint|kəmˈpleɪnt|
receipt|rɪˈsiːt|
refund|ˈriːfʌnd|
crack|kræk|
timetable|ˈtaɪmteɪbl|
boarding pass|ˈbɔːdɪŋ pɑːs|
passport|ˈpɑːspɔːt|
departure|dɪˈpɑːtʃə|
gate|ɡeɪt|
one-way|ˌwʌn ˈweɪ|
check in|tʃek ɪn|
security|sɪˈkjʊərəti|
window seat|ˈwɪndəʊ siːt|
reception|rɪˈsepʃn|
single room|ˈsɪŋɡl ruːm|
double room|ˈdʌbl ruːm|
reservation|ˌrezəˈveɪʃn|
check out|tʃek aʊt|
towel|ˈtaʊəl|
deposit|dɪˈpɒzɪt|
vacant|ˈveɪkənt|
traffic lights|ˈtræfɪk laɪts|
roundabout|ˈraʊndəbaʊt|
get off|ɡet ɒf|
get on|ɡet ɒn|
arrival|əˈraɪvl|
platform|ˈplætfɔːm|
fare|feə|
nearby|ˌnɪəˈbaɪ|
boss|bɒs|
wage|weɪdʒ|
salary|ˈsæləri|
employee|ɪmˈplɔɪiː|
full-time|ˌfʊl ˈtaɪm|
part-time|ˌpɑːt ˈtaɪm|
apply|əˈplaɪ|
vacancy|ˈveɪkənsi|
supplier|səˈplaɪə|
stack|stæk|
load|ləʊd|
parcel|ˈpɑːsl|
sticker|ˈstɪkə|
inventory|ˈɪnvəntri|
courier|ˈkʊriə|
scanner|ˈskænə|
sore|sɔː|
fever|ˈfiːvə|
cough|kɒf|
prescription|prɪˈskrɪpʃn|
medicine|ˈmedsn|
symptom|ˈsɪmptəm|
injury|ˈɪndʒəri|
dizzy|ˈdɪzi|
apologize|əˈpɒlədʒaɪz|
broken|ˈbrəʊkən|
apology|əˈpɒlədʒi|
damaged|ˈdæmɪdʒd|
exchange|ɪksˈtʃeɪndʒ|
replace|rɪˈpleɪs|
misunderstanding|ˌmɪsʌndəˈstændɪŋ|
inconvenience|ˌɪnkənˈviːniəns|
luckily|ˈlʌkɪli|
unfortunately|ʌnˈfɔːtʃənətli|
notice|ˈnəʊtɪs|
realise|ˈrɪəlaɪz|
happen|ˈhæpən|
in the end|ɪn ðə end|
break down|breɪk daʊn|
eventually|ɪˈventʃuəli|
memory|ˈmeməri|
foreign|ˈfɒrən|
unforgettable|ˌʌnfəˈɡetəbl|
seldom|ˈseldəm|
once|wʌns|
brave|breɪv|
so far|səʊ fɑː|
never mind|ˌnevə ˈmaɪnd|
reason|ˈriːzən|
result|rɪˈzʌlt|
however|haʊˈevə|
instead|ɪnˈsted|
anyway|ˈeniweɪ|
get lost|ɡet lɒst|
traffic|ˈtræfɪk|
on time|ɒn taɪm|
forward|ˈfɔːwəd|
notification|ˌnəʊtɪfɪˈkeɪʃn|
urgent|ˈɜːdʒənt|
organise|ˈɔːɡənaɪz|
on my way|ɒn maɪ weɪ|
let someone know|let ˈsʌmwʌn nəʊ|
attend|əˈtend|
shortly|ˈʃɔːtli|
attachment|əˈtætʃmənt|
regards|rɪˈɡɑːdz|
sincerely|sɪnˈsɪəli|
apologise|əˈpɒlədʒaɪz|
enclose|ɪnˈkləʊz|
enquiry|ɪnˈkwaɪəri|
inbox|ˈɪnbɒks|
get back to|ɡet bæk tuː|
paragraph|ˈpærəɡrɑːf|
topic|ˈtɒpɪk|
detail|ˈdiːteɪl|
conclusion|kənˈkluːʒn|
punctuation|ˌpʌŋktʃuˈeɪʃn|
in addition|ɪn əˈdɪʃn|
main idea|meɪn aɪˈdɪə|
such as|sʌtʃ æz|
dispatch|dɪˈspætʃ|
inspect|ɪnˈspekt|
misplace|ˌmɪsˈpleɪs|
overdue|ˌəʊvəˈdjuː|
run out of|rʌn aʊt əv|
hand over|hænd ˈəʊvə|
figure out|ˈfɪɡə aʊt|
by then|baɪ ðen|
waste|weɪst|
regret|rɪˈɡret|
rush|rʌʃ|
beforehand|bɪˈfɔːhænd|
previously|ˈpriːviəsli|
by the time|baɪ ðə taɪm|
earlier|ˈɜːliə|
turn out|tɜːn aʊt|
carry on|ˈkæri ɒn|
give up|ɡɪv ʌp|
set off|set ɒf|
end up|end ʌp|
make it|meɪk ɪt|
sort out|sɔːt aʊt|
overlook|ˌəʊvəˈlʊk|
assume|əˈsjuːm|
misunderstand|ˌmɪsʌndəˈstænd|
double-check|ˌdʌbl ˈtʃek|
hesitate|ˈhezɪteɪt|
at first|ət ˈfɜːst|
soon after|suːn ˈɑːftə|
later on|ˈleɪtər ɒn|
straight away|ˌstreɪt əˈweɪ|
in the meantime|ɪn ðə ˈmiːntaɪm|
achieve|əˈtʃiːv|
lately|ˈleɪtli|
steadily|ˈstedɪli|
overcome|ˌəʊvəˈkʌm|
struggle|ˈstrʌɡl|
determined|dɪˈtɜːmɪnd|
gain|ɡeɪn|
routine|ruːˈtiːn|
ever since|ˌevə ˈsɪns|
for ages|fər ˈeɪdʒɪz|
long-term|ˌlɒŋ ˈtɜːm|
keep up|kiːp ˈʌp|
settle in|ˈsetl ɪn|
get used to|ɡet ˈjuːst tuː|
no longer|nəʊ ˈlɒŋɡə|
maintain|meɪnˈteɪn|
exhausted|ɪɡˈzɔːstɪd|
rehearse|rɪˈhɜːs|
renovate|ˈrenəveɪt|
recover|rɪˈkʌvə|
stamina|ˈstæmɪnə|
stay up|steɪ ˈʌp|
burn out|bɜːn ˈaʊt|
jog|dʒɒɡ|
back then|bæk ˈðen|
as a result|əz ə rɪˈzʌlt|
bump into|bʌmp ˈɪntuː|
lose touch|luːz ˈtʌtʃ|
keep in touch|kiːp ɪn ˈtʌtʃ|
come across|kʌm əˈkrɒs|
admit|ədˈmɪt|
all along|ɔːl əˈlɒŋ|
melt|melt|
freeze|friːz|
boil|bɔɪl|
dissolve|dɪˈzɒlv|
shrink|ʃrɪŋk|
expand|ɪkˈspænd|
rust|rʌst|
wear out|weər ˈaʊt|
persuade|pəˈsweɪd|
negotiate|nɪˈɡəʊʃieɪt|
invest|ɪnˈvest|
raise|reɪz|
promotion|prəˈməʊʃn|
bargain|ˈbɑːɡən|
pay off|peɪ ˈɒf|
donate|dəʊˈneɪt|
inherit|ɪnˈherɪt|
lottery|ˈlɒtəri|
relocate|ˌriːləʊˈkeɪt|
resign|rɪˈzaɪn|
mansion|ˈmænʃn|
scholarship|ˈskɒləʃɪp|
quit|kwɪt|
imagine|ɪˈmædʒɪn|
backup|ˈbækʌp|
insurance|ɪnˈʃʊərəns|
warranty|ˈwɒrənti|
otherwise|ˈʌðəwaɪz|
provided that|prəˈvaɪdɪd ðæt|
flashlight|ˈflæʃlaɪt|
make sure|meɪk ˈʃʊə|
sign up|saɪn ˈʌp|
install|ɪnˈstɔːl|
approve|əˈpruːv|
announce|əˈnaʊns|
require|rɪˈkwaɪə|
supply|səˈplaɪ|
storage|ˈstɔːrɪdʒ|
recycle|ˌriːˈsaɪkl|
assemble|əˈsembl|
manufacture|ˌmænjuˈfæktʃə|
construct|kənˈstrʌkt|
publish|ˈpʌblɪʃ|
discover|dɪˈskʌvə|
import|ɪmˈpɔːt|
export|ɪkˈspɔːt|
produce|prəˈdjuːs|
seal|siːl|
notify|ˈnəʊtɪfaɪ|
instruct|ɪnˈstrʌkt|
prohibit|prəˈhɪbɪt|
permit|pəˈmɪt|
register|ˈredʒɪstə|
reserve|rɪˈzɜːv|
remove|rɪˈmuːv|
display|dɪˈspleɪ|
fasten|ˈfɑːsn|
guard|ɡɑːd|
upload|ʌpˈləʊd|
issue|ˈɪʃuː|
put off|pʊt ˈɒf|
set up|set ˈʌp|
carry out|ˌkæri ˈaʊt|
call off|kɔːl ˈɒf|
mention|ˈmenʃn|
claim|kleɪm|
deny|dɪˈnaɪ|
insist|ɪnˈsɪst|
assure|əˈʃʊə|
previous|ˈpriːviəs|
the day before|ðə deɪ bɪˈfɔː|
the following day|ðə ˌfɒləʊɪŋ ˈdeɪ|
wonder|ˈwʌndə|
inquire|ɪnˈkwaɪə|
curious|ˈkjʊəriəs|
whether|ˈweðə|
find out|faɪnd ˈaʊt|
interrupt|ˌɪntəˈrʌpt|
in advance|ɪn ədˈvɑːns|
no idea|nəʊ aɪˈdɪə|
urge|ɜːdʒ|
warn|wɔːn|
advise|ədˈvaɪz|
forbid|fəˈbɪd|
beg|beɡ|
encourage|ɪnˈkʌrɪdʒ|
command|kəˈmɑːnd|
ban|bæn|
propose|prəˈpəʊz|
threaten|ˈθretn|
reassure|ˌriːəˈʃʊə|
confess|kənˈfes|
accuse|əˈkjuːz|
murmur|ˈmɜːmə|
inform|ɪnˈfɔːm|
plead|pliːd|
stranger|ˈstreɪndʒə|
tenant|ˈtenənt|
mechanic|məˈkænɪk|
pharmacist|ˈfɑːməsɪst|
cashier|kæˈʃɪə|
receptionist|rɪˈsepʃənɪst|
souvenir|ˌsuːvəˈnɪə|
charity|ˈtʃærəti|
suburb|ˈsʌbɜːb|
valley|ˈvæli|
island|ˈaɪlənd|
castle|ˈkɑːsl|
festival|ˈfestɪvl|
harvest|ˈhɑːvɪst|
resident|ˈrezɪdənt|
ancestor|ˈænsestə|
architect|ˈɑːkɪtekt|
novelist|ˈnɒvəlɪst|
surgeon|ˈsɜːdʒən|
lawyer|ˈlɔːjə|
musician|mjuˈzɪʃn|
ceremony|ˈserəməni|
tunnel|ˈtʌnl|
volunteer|ˌvɒlənˈtɪə|
generous|ˈdʒenərəs|
stubborn|ˈstʌbən|
talkative|ˈtɔːkətɪv|
ambitious|æmˈbɪʃəs|
deal with|ˈdiːl wɪð|
rely on|rɪˈlaɪ ɒn|
look after|lʊk ˈɑːftə|
get along|ɡet əˈlɒŋ|
follow up|ˈfɒləʊ ʌp|
look into|ˈlʊk ɪntuː|
fill in|fɪl ˈɪn|
take on|teɪk ˈɒn|
hand out|hænd ˈaʊt|
back up|bæk ˈʌp|
step down|step ˈdaʊn|
bring up|brɪŋ ˈʌp|
turn up|tɜːn ˈʌp|
work out|wɜːk ˈaʊt|
clean up|kliːn ˈʌp|
fill up|fɪl ˈʌp|
try on|traɪ ˈɒn|
throw away|θrəʊ əˈweɪ|
get back|ɡet ˈbæk|
show around|ʃəʊ əˈraʊnd|
make a decision|meɪk ə dɪˈsɪʒn|
make an effort|meɪk ən ˈefət|
do research|duː rɪˈsɜːtʃ|
do the shopping|duː ðə ˈʃɒpɪŋ|
take a break|teɪk ə ˈbreɪk|
take a risk|teɪk ə ˈrɪsk|
have a look|hæv ə ˈlʊk|
have a chat|hæv ə ˈtʃæt|
place an order|pleɪs ən ˈɔːdə|
keep to a schedule|kiːp tuː ə ˈʃedjuːl|
track a parcel|træk ə ˈpɑːsl|
issue an invoice|ˈɪʃuː ən ˈɪnvɔɪs|
keep a record|kiːp ə ˈrekɔːd|
cut costs|kʌt ˈkɒsts|
reach a target|riːtʃ ə ˈtɑːɡɪt|
make a delivery|meɪk ə dɪˈlɪvəri|
opinion|əˈpɪnjən|
viewpoint|ˈvjuːpɔɪnt|
belief|bɪˈliːf|
personally|ˈpɜːsənəli|
convinced|kənˈvɪnst|
doubt|daʊt|
frankly|ˈfræŋkli|
reckon|ˈrekən|
absolutely|ˈæbsəluːtli|
partly|ˈpɑːtli|
entirely|ɪnˈtaɪəli|
objection|əbˈdʒekʃn|
compromise|ˈkɒmprəmaɪz|
oppose|əˈpəʊz|
valid|ˈvælɪd|
reject|rɪˈdʒekt|
instance|ˈɪnstəns|
evidence|ˈevɪdəns|
proof|pruːf|
illustrate|ˈɪləstreɪt|
particularly|pəˈtɪkjələli|
furthermore|ˌfɜːðəˈmɔː|
consequently|ˈkɒnsɪkwəntli|
namely|ˈneɪmli|
nevertheless|ˌnevəðəˈles|
whereas|weərˈæz|
despite|dɪˈspaɪt|
drawback|ˈdrɔːbæk|
advantage|ədˈvɑːntɪdʒ|
disadvantage|ˌdɪsədˈvɑːntɪdʒ|
contrast|ˈkɒntrɑːst|
unlike|ʌnˈlaɪk|
plot|plɒt|
scene|siːn|
instantly|ˈɪnstəntli|
gradually|ˈɡrædʒuəli|
ultimately|ˈʌltɪmətli|
unexpectedly|ˌʌnɪkˈspektɪdli|
relieved|rɪˈliːvd|
astonished|əˈstɒnɪʃt|
candidate|ˈkændɪdət|
qualification|ˌkwɒlɪfɪˈkeɪʃn|
strength|streŋθ|
weakness|ˈwiːknəs|
reference|ˈrefrəns|
application|ˌæplɪˈkeɪʃn|
employer|ɪmˈplɔɪə|
punctual|ˈpʌŋktʃuəl|
agenda|əˈdʒendə|
attendee|ˌætenˈdiː|
extension|ɪkˈstenʃn|
voicemail|ˈvɔɪsmeɪl|
transfer|trænsˈfɜː|
connect|kəˈnekt|
operator|ˈɒpəreɪtə|
apologies|əˈpɒlədʒiz|
enquire|ɪnˈkwaɪə|
compensation|ˌkɒmpenˈseɪʃn|
dissatisfied|dɪsˈsætɪsfaɪd|
unacceptable|ˌʌnəkˈseptəbl|
faulty|ˈfɔːlti|
defective|dɪˈfektɪv|
resolve|rɪˈzɒlv|
grateful|ˈɡreɪtfl|
skim|skɪm|
infer|ɪnˈfɜː|
context|ˈkɒntekst|
gist|dʒɪst|
headline|ˈhedlaɪn|
highlight|ˈhaɪlaɪt|
predict|prɪˈdɪkt|
summarise|ˈsʌməraɪz|
shorthand|ˈʃɔːthænd|
abbreviation|əˌbriːviˈeɪʃn|
symbol|ˈsɪmbl|
recording|rɪˈkɔːdɪŋ|
rewind|ˌriːˈwaɪnd|
keyword|ˈkiːwɜːd|
signpost|ˈsaɪnpəʊst|
transcribe|trænˈskraɪb|
draft|drɑːft|
proofread|ˈpruːfriːd|
revise|rɪˈvaɪz|
outline|ˈaʊtlaɪn|
opening|ˈəʊpnɪŋ|
closing|ˈkləʊzɪŋ|
spelling|ˈspelɪŋ|
concise|kənˈsaɪs|
progress|ˈprəʊɡres|
milestone|ˈmaɪlstəʊn|
reflect|rɪˈflekt|
confident|ˈkɒnfɪdənt|
fluent|ˈfluːənt|
accuracy|ˈækjərəsi|
checklist|ˈtʃeklɪst|
polish|ˈpɒlɪʃ|
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

// Ma’nosiga mos kelmaydigan yoki mavhum so‘zlar uchun emoji ko‘rsatilmaydi (adashtirmasligi uchun): bunday so‘zda harfli kartochka chiqadi
// va u rasm asosidagi so‘z kartochkalariga kirmaydi.
const WEAK_ICON = new Set(["want", "enjoy", "get", "have", "make", "turn", "try", "use", "finish", "stay", "arrive", "still", "well", "together", "please", "there", "born", "double", "late", "they", "we", "you", "plan", "excuse me", "let's", "corner", "question", "relative", "sum"]);
export function vdata(v) {
  const d = VD.get(norm(v.en)) || { ipa: "", icon: "" };
  const o = WEAK_ICON.has(norm(v.en)) ? { ...d, icon: "" } : d;
  return v.ipa ? { ...o, ipa: v.ipa } : o;
}

/* ===================== Mavzular, daraja va qo‘shimcha so‘zlar ===================== */

/** Mavzu kaliti → to‘liq nomi. Kalitlar vocab-*.js fayllaridagi «# kalit» qatorlarida ishlatiladi. */
export const CATEGORIES = {
  greet: "Kundalik suhbat va salomlashish", family: "Oila va insonlar", home: "Uy va kundalik ishlar",
  time: "Vaqt, sana va raqamlar", food: "Oziq-ovqat va xaridlar", city: "Transport va shahar",
  feel: "His-tuyg‘ular va fikr bildirish", ask: "Savol berish va javob qaytarish", verb: "Eng ko‘p ishlatiladigan fe’llar",
  adj: "Sifatlar, ravishlar va predloglar", tech: "Telefon va texnologiya", edu: "Ta’lim va ish",
  work: "Ish joyidagi muloqot", logi: "Logistika, ombor va yetkazib berish", prob: "Muammolarni tushuntirish va hal qilish",
};
/** Qisqa nomlar (filtr tugmalari uchun). */
export const CAT_SHORT = {
  greet: "Salomlashish", family: "Oila", home: "Uy", time: "Vaqt", food: "Oziq-ovqat", city: "Shahar", feel: "His-tuyg‘u",
  ask: "Savollar", verb: "Fe’llar", adj: "Sifatlar", tech: "Texnologiya", edu: "Ta’lim", work: "Ish joyi", logi: "Logistika", prob: "Muammolar",
};
export const LEVELS_V = ["A1", "A2", "B1"];

/** Mavjud 42 darsning so‘zlari qaysi mavzuga kirishi. Dars kaliti → mavzu. */
const LESSON_CAT = {};
for (const [cat, ids] of Object.entries({
  greet: "u01-l01 u01-l02", edu: "u01-l03", time: "u01-l04 u06-l01 u06-l02 u06-l03 u05-l03 u12-l01 u12-l04 u12-l05",
  family: "u02-l01 u02-l02 u03-l03 u04-l01", feel: "u02-l03", ask: "u02-l04 u08-l02",
  home: "u03-l01 u03-l02 u03-l04 u04-l02 u07-l01 u07-l03 u11-l03", adj: "u04-l03 u05-l04 u07-l02",
  verb: "u05-l01 u05-l02 u08-l01 u11-l01 u11-l02 u12-l02 u12-l03", food: "u09-l01 u09-l02 u09-l03 u09-l04", city: "u10-l01 u10-l02 u10-l03",
})) for (const k of ids.split(" ")) LESSON_CAT["a1-" + k] = cat;
/** A2 darslarining so‘zlari qaysi mavzuga kirishi (kalit: to‘liq dars id si). */
for (const [cat, ids] of Object.entries({
  time: "b1-u01-l03 b1-u01-l04 a2-u01-l01 a2-u01-l02 a2-u01-l03 a2-u01-l04 a2-u01-l05 a2-u06-l02 a2-u06-l04 a2-u09-l01",
  verb: "a2-u02-l01 a2-u02-l02 a2-u02-l03 a2-u05-l01 a2-u05-l04 a2-u09-l02",
  work: "a2-u02-l04 a2-u05-l02 a2-u05-l03 a2-u06-l03 a2-u08-l01 a2-u10-l01 a2-u10-l02 a2-u10-l03",
  adj: "a2-u03-l01 a2-u03-l02 a2-u03-l03 a2-u03-l04 a2-u04-l03",
  logi: "b1-u01-l01 a2-u04-l01 a2-u06-l01 a2-u06-l05 a2-u08-l02",
  food: "a2-u04-l02",
  city: "a2-u07-l01 a2-u07-l02 a2-u07-l03",
  prob: "a2-u08-l03 a2-u08-l04 a2-u09-l03 b1-u01-l02",
})) for (const k of ids.split(" ")) LESSON_CAT[k] = cat;
/** B1 darslari (u02–u10). */
for (const [cat, ids] of Object.entries({
  time: "b1-u02-l01 b1-u02-l02 b1-u02-l03 b1-u02-l04",
  logi: "b1-u03-l01 b1-u03-l02 b1-u03-l03 b1-u03-l04 b1-u08-l01 b1-u08-l02 b1-u08-l03 b1-u08-l04 b1-u10-l01 b1-u10-l02 b1-u10-l03 b1-u10-l04",
  work: "b1-u04-l01 b1-u04-l02 b1-u04-l03 b1-u04-l04 b1-u07-l01 b1-u07-l04 b1-u09-l02 b1-u09-l03 b1-u09-l04",
  ask: "b1-u05-l01 b1-u05-l02 b1-u05-l03 b1-u05-l04",
  adj: "b1-u06-l01 b1-u06-l02 b1-u06-l03 b1-u06-l04",
  verb: "b1-u07-l02 b1-u07-l03 b1-u09-l01",
})) for (const k of ids.split(" ")) LESSON_CAT[k] = cat;

/** So‘z uchun mavzu kaliti: qo‘shimcha so‘zda o‘zining kaliti, dars so‘zida dars bo‘yicha. */
export const catOf = (v) => v.cat || LESSON_CAT[v.lessonId] || "greet";
export const levelOf = (v) => v.level || (/^b1-/.test(v.lessonId || "") ? "B1" : /^a2-/.test(v.lessonId || "") ? "A2" : "A1");

/** Rasm kaliti: inglizcha so‘zdan (kichik harf, harf-raqamdan boshqasi «-» ga). Bir so‘z — bitta rasm. */
export const slug = (en) => norm(en).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * vocab-*.js dagi { level, raw } ni so‘z yozuvlariga aylantiradi.
 * Qaytaradi: { entries, problems } — problems bo‘sh bo‘lishi kerak (testlar tekshiradi).
 */
export function parseExtra(mod) {
  const entries = [], problems = [];
  let cat = null;
  String((mod && mod.raw) || "").split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    if (line.startsWith("#")) { cat = line.slice(1).trim(); if (!CATEGORIES[cat]) problems.push(`${i + 1}-qator: noma’lum mavzu «${cat}»`); return; }
    const p = line.split("|").map((s) => s.trim());
    if (p.length !== 6 || p.some((s) => !s)) { problems.push(`${i + 1}-qator: 6 ta to‘la maydon kerak («${line.slice(0, 40)}»)`); return; }
    if (!cat) { problems.push(`${i + 1}-qator: mavzu belgilanmagan`); return; }
    const [en, uz, ipa, pos, exEn, exUz] = p;
    entries.push({ id: "x-" + slug(en), en, uz, ipa, pos, ex: { en: exEn, uz: exUz }, level: mod.level, cat, lessonId: null, ext: true });
  });
  return { entries, problems };
}
