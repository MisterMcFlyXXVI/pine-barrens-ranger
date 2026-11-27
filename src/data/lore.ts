/**
 * Cryptid lore for the Dex: the real-world legend (unlocked at 2 stars) and how the
 * creature lives in Pine Holler (3 stars). The legends are told as legends; where
 * a source is thin or disputed the text says so rather than inventing history.
 * Stories from living Indigenous traditions (Wampus Cat, Pukwudgie, Sasquatch,
 * Thunderbird, Wendigo) name whose stories they are and keep a respectful distance.
 *
 * Why they're all here: the Quiet Zone. Everywhere else the sky is full of signal;
 * this valley is one of the last quiet places, and the stories come here to sleep
 * (Clara's theory, in her first heart scene and her chatter).
 */
export interface Lore { legend: string; local: string }

export const LORE: Record<string, Lore> = {
  jackalope: {
    legend: 'Made famous by 1930s Wyoming taxidermists and older frontier tall tales, in which prairie travelers swore that horned jackrabbits could mimic cowboys singing around the campfire. A small colony seems to have followed the rail lines east into the quiet clover meadows.',
    local: 'Nests in the clover borders along the Pine Trail. Pippa and Sam swear one has been stealing ribbon scraps from their clubhouse, and Buster refuses to bark at it.',
  },
  nightcrawler: {
    legend: 'First glimpsed on grainy security footage in Fresno, California, in the late 2000s, and later in the Yosemite foothills: armless, pale-legged wanderers that step quietly along moonlit fence rows wherever human noise fades.',
    local: 'Drifts past the cabin fence posts at night like walking pale laundry. Ruth always thought it was a sheet blown off somebody\'s clothesline.',
  },
  hoop_snake: {
    legend: 'A staple of Appalachian and lumber-camp yarns since the 1700s: a snake that takes its tail in its jaws and bowls down steep trails like a wagon wheel whenever the sun warms the shale.',
    local: 'Coils on the sunny rocky switchbacks above the Apple Grove. Gideon jokes that if one ever rolls down the hill it\'ll take out Mabel\'s diner porch.',
  },
  squonk: {
    legend: 'Recorded by timber cruisers in the hemlock forests of northern Pennsylvania and written up in Fearsome Creatures of the Lumberwoods (1910): a wrinkled, self-conscious creature that weeps so bitterly that, if cornered, it dissolves into its own tears.',
    local: 'Hides under wet hemlock ferns in the rain, weeping into the puddles. Toby heard one crying by the creek and left a dry wool blanket on a stump for it.',
  },
  albatwitch: {
    legend: 'From the Susquehanna River bluffs near Chickies Rock, Pennsylvania. Its name is usually traced to "apple snitch": a little tree-dwelling ape-like creature that hides in orchard boughs and tosses cores at people walking below at twilight.',
    local: 'Raids the heirloom trees in the Apple Grove at dusk and pelts anyone nearby with half-eaten cores. Mabel bakes extra apple tarts just to keep them out of her pantry.',
  },
  snarly_yow: {
    legend: 'Told since the 1800s along South Mountain in western Maryland, toward the Potomac and Harpers Ferry: a huge black phantom hound that blocks lonely roads and rail beds and cannot be struck, then vanishes into thin air.',
    local: 'Paces the overgrown C&O tracks at dusk. Barney believes it\'s an old rail-yard omen that comes before storms, though it has never harmed anyone who stood still.',
  },
  wampus_cat: {
    legend: 'Often retold as a Cherokee story: in one version a woman who wears the skin or mask of a mountain lion keeps watch over her people at night. Most written versions are modern retellings, so treat the details with care. Timber camps later mixed her with tales of a six-legged panther on the high ridges.',
    local: 'Stalks the ridge line above town at night. Dr. Okafor notes that loggers tell wild stories about a six-legged panther, but older mountain traditions speak of a fierce guardian of the ridge who shouldn\'t be trifled with.',
  },
  bolter: {
    legend: 'A Colorado mountain legend from the same 1910 book as the Squonk: a whale-sized, flat-headed creature that hooks its tail over a high ridge and waits, then slides down the slope like an avalanche on whatever passes below.',
    local: 'Anchors its tail hooks in the wet shale above the valley when it rains, waiting to slide down the scree. Gideon warns hikers never to whistle under loose shale.',
  },
  wampahoofus: {
    legend: 'From Vermont, around Mount Mansfield: one of the sidehill creatures whose legs are shorter on one side so it can walk level around steep peaks, and which is helpless if it ever turns to face the other way.',
    local: 'Grazes the steep contour lines below Radio Ridge. Agnes has a faded 1920s postcard of one in the Historical Society archive.',
  },
  loveland_frog: {
    legend: 'Reported along the Little Miami River near Loveland, Ohio, in 1955 and again in 1972: upright, frog-like figures about four feet tall, one said to hold a wand that threw sparks, standing by misty riverbanks before slipping back into the reeds.',
    local: 'Stands on mossy hummocks in the Glades in warm rain, waving a glowing reed like a tiny signalman. Barney swears one once waved him down before a washout on the spur line.',
  },
  polliwog: {
    legend: 'No legend outside Pine Holler. Berry pickers say it hatches only in the tannin-dark peat pools of the high cranberry glades and fattens on fallen bog berries every autumn.',
    local: 'A plump, cranberry-stained giant tadpole of the acid bog pools. Pippa and Sam once kept one in a washbasin until Agnes made them carry it back.',
  },
  skunk_ape: {
    legend: 'Famous across Florida\'s cypress swamps and sawgrass marshes for its sulfur-and-wet-dog musk. A solitary wanderer seems to have followed the misty river valleys north into the bog thickets.',
    local: 'Wanders the alder thickets at the edge of the Glades. You smell it three tiles before you see it. Gideon keeps a jar of cedar salve at the forge for anyone caught downwind.',
  },
  altamaha: {
    legend: 'Told for generations along Georgia\'s Altamaha River, near Darien: a ridged, sturgeon-snouted river serpent that surfaces only when heavy mist lies on still water.',
    local: 'Glides through the deep, tannin-dark water of the Glades lake when fog settles. Barney spots its humps from his rowboat early in the morning.',
  },
  wisp: {
    legend: 'Known in old-world peat bogs and Appalachian hollows alike as ignis fatuus, "foolish fire": pale flames over marsh water that drift just out of reach and lure travelers off safe ground after dark.',
    local: 'Drifts over the peat bogs at night like a blue lantern. Ruth warns never to follow the cold lights off the boardwalk. Elias learned to read their drift like a timetable.',
  },
  chessie: {
    legend: 'Chesapeake Bay boaters reported a shy, dark serpent, by some estimates thirty feet long, through the 1970s and 1980s, including a 1982 videotape. It arcs through morning fog and has never capsized a boat.',
    local: 'Travels the mountain waterways into the deep basin of the Glades lake on thick foggy mornings. Dr. Okafor keeps a waterproof camera on the dock, hoping for a clear profile.',
  },
  bessie: {
    legend: 'Lake Erie\'s serpent, reported as far back as 1793 and nicknamed "South Bay Bessie": a long, broad-snouted creature that seems more curious about boats than threatening.',
    local: 'Cruises the slow drainage canal beside the old C&O spur and surfaces whenever somebody plays music or drops sweet corn by the lock.',
  },
  pukwudgie: {
    legend: 'From the oral traditions of the Wampanoag and neighboring Algonquian peoples of the Northeast. Pukwudgies belong to the wild places: they may help people who treat the land with humility, and lead the arrogant astray. These are living stories; they are told here with respect, not as a monster tale.',
    local: 'Keeps to the briar hollows between the Pine Trail and the Glades. Agnes\'s notes say to leave a little wild honeycomb, keep your voice down, and never treat the woods as yours.',
  },
  ozark_howler: {
    legend: 'Reported in the Ozark hills of Arkansas and Missouri as a bear-sized, horned cat whose cry echoes off the hollow walls on still nights. Some folklorists suspect the modern legend began as a 1990s hoax; the hills tell it anyway.',
    local: 'Its brassy cry sounds like an elk bugle crossed with a steam whistle. The kids thought it was a ghost train until Dr. Okafor isolated the recording.',
  },
  slippery_skin: {
    legend: 'Old Slipperyskin was a huge, clever bear of Vermont\'s Northeast Kingdom that settlers in the early 1800s swore could not be trapped or shot: it slipped every snare. Pine Holler\'s version has taken to the sulfur springs.',
    local: 'Soaks in the warm Sulphur Springs after dusk, leaving an oily sheen on the rocks and a rotten-egg smell drifting toward town.',
  },
  mothman: {
    legend: 'West Virginia\'s most famous legend. First reported in November 1966 near the old TNT bunkers outside Point Pleasant: a silent winged shadow with glowing red eyes that seemed to appear wherever danger was coming.',
    local: 'Perches in the sawmill rafters, or on your shed roof on foggy nights. Pine Holler doesn\'t treat it as a villain: it\'s a watcher that shows up before storms and washouts, as if to warn you.',
  },
  jersey_devil: {
    legend: 'Born of 18th-century New Jersey Pine Barrens folklore (Mother Leeds\'s cursed thirteenth child) and famously "tracked" across rooftops during the January 1909 panic: a horse-headed, bat-winged wanderer of charred pines.',
    local: 'Roosts in the blackened timber of the old burn scar. Mabel says it flew down from the Pine Barrens just to get away from turnpike traffic.',
  },
  snallygaster: {
    legend: 'From Maryland\'s Frederick County and the South Mountain country, named from the German "schneller Geist," quick ghost. A 1909 newspaper flurry made it a half-reptile, half-bird terror that could be warded off with seven-pointed stars painted on barns.',
    local: 'Swoops over the sawmill\'s rusted roof at dusk, drawn to fermented berry mash. Gideon painted a seven-pointed star on the forge door years ago, just in case.',
  },
  dover_demon: {
    legend: 'Seen on two misty April nights in 1977 along the fieldstone walls of Dover, Massachusetts: a fragile, spindly creature with an oversized head and glowing orange eyes that seemed more startled by headlights than threatening.',
    local: 'Creeps along the stacked stone walls near the station at night, blinking at passing lanterns before slipping into the brush.',
  },
  grafton: {
    legend: 'Reported in June 1964 on the foggy banks of the Tygart Valley River in Grafton, West Virginia: a tall, broad, seemingly headless pale figure that moved silently through the mist and vanished into the trees.',
    local: 'Steps out of river fog by the sawmill timber stacks. It leaves wide tracks in the mud but has never made a sound.',
  },
  dwayyo: {
    legend: 'Surfaced in mid-1960s newspaper accounts from Frederick County, Maryland: an upright, bushy-tailed wolf-like beast. Porch stories gave it a long rivalry with the Snallygaster.',
    local: 'Hunts the deep hemlock ridges at night. Gideon won\'t walk the north timber trail after midnight without a lantern.',
  },
  hodag: {
    legend: 'Rhinelander, Wisconsin, 1893: lumberman Eugene Shepard "captured" a horned, spine-backed reptilian bulldog said to be born from the ashes of cremated oxen. The capture was a famous hoax; the Hodag stayed the town\'s pride.',
    local: 'Lairs in the fallen timber behind the sawmill, snorting puffs of steam into the cold. Toby carries a lemon because an old almanac said Hodags hate them. Nobody has told him the almanac was a joke.',
  },
  hopkinsville_goblin: {
    legend: 'From the August 1955 farmhouse encounter near Kelly and Hopkinsville, Kentucky: small, silver, big-eared figures that floated near the fence line all night and seemed unbothered by noise or light.',
    local: 'Hovers around the boarded-up mine hill and the Radio Ridge fence, fascinated by copper wire, batteries and camera flashes.',
  },
  pigman: {
    legend: 'Whispered about around Northfield, Vermont, since the mid-20th century: a hulking figure in work clothes with a pale, pig-like face, seen near lonely tracks and old mill roads at night.',
    local: 'Lurks by the sawmill and the old sidings, raiding sweet corn patches. Folks speak of it with as much pity as fear, like a ghost of the logging camps.',
  },
  flatwoods: {
    legend: 'Braxton County, West Virginia, September 1952: a group climbing a foggy hill after a fiery light saw a towering, spade-hooded figure in a pleated, skirt-like shape hovering in a sharp, metallic-smelling mist.',
    local: 'Floats through the mist near the Radio Ridge summit, trailing a sharp metallic smell. Dr. Okafor thinks the old relay tower draws it like a beacon.',
  },
  sasquatch: {
    legend: 'The name comes from the Halkomelem word sasq\'ets, from Coast Salish peoples of the Pacific Northwest, whose stories of hairy giants of the forest are their own. Across North America it has become the patient, elusive guardian of the deep woods.',
    local: 'The ancient steward of Pine Holler\'s deepest hemlocks. When Elias set iron traps three autumns ago, it snapped the first ones clean in half without hurting a soul, then waited for a ranger wise enough to dismantle the rest.',
  },
  thunderbird: {
    legend: 'A sacred sky-being in the traditions of many Indigenous nations across North America, whose wingbeats bring thunder and whose eyes flash lightning. Its stories belong to those nations; this game shows it with reverence.',
    local: 'Rides the summer and autumn thunderheads over Radio Ridge. Dr. Okafor\'s notes speak of it with reverence: a storm that clears the static choking the valley\'s airwaves.',
  },
  indrid_cold: {
    legend: 'From Woodrow Derenberger\'s November 1966 account on a highway near Parkersburg, West Virginia: a smiling stranger in a shiny suit who spoke without moving his lips, forever tangled up with the Mothman year.',
    local: 'Appears at the Crossroads in the Witching Hour, smiling, saying nothing aloud. He isn\'t a threat so much as an uncanny mirror: he carries your Static Radio\'s voice up the ridge to Elias.',
  },
  bray_road: {
    legend: 'Reported along rural roads near Elkhorn, Wisconsin, from the late 1980s into the 1990s: a large, wolf-like creature seen kneeling at the roadside or running on two legs under the moon.',
    local: 'Prowls the deep ridges under full moons, testing the nerve of anyone on the timber line. Once calmed, it watches from the treeline like an old sentinel.',
  },
  wendigo: {
    legend: 'From the oral traditions of Algonquian peoples, including the Cree, Ojibwe and Innu. It is a moral warning against greed, selfishness and isolation in the starving winter, and the answer to its cold is generosity and shared warmth. These are living teachings, told here with care.',
    local: 'Tied to the coldest nights and the memory of hunger in the old mountain camps. Nobody in Pine Holler hunts it. It is quieted by warmth, restraint, and food freely given.',
  },
  weaver: {
    legend: 'A Pine Holler original with no legend outside the valley: the eldest of the Nightcrawlers, said to drift through Crossroads fog in the Witching Hour, stitching loose threads of quiet back across the hollow.',
    local: 'Comes only when the fog is thick and both the Nightcrawlers and the Wisps trust you, weaving pale silk between the trees.',
  },
  awful: {
    legend: 'A Vermont mountain legend: a griffin-like creature with an eagle\'s head and wings and a lion\'s body, said to haunt the high crags and terrify anyone caught out alone.',
    local: 'Nests on the high cliffs and watches over the whole hollow at dawn. It despises sneaking: stand your ground with a Brass Bell and it will glide out over the valley in respect.',
  },
  sheepsquatch: {
    legend: 'West Virginia\'s own, from the 1990s in Boone, Kanawha and Mason Counties: a shaggy, white-wooled, ram-horned beast seen near creek beds and hollow edges, smelling of sulfur.',
    local: 'The heart of Pine Holler\'s story. Three autumns ago, desperate to prove the folklore and save the town, Elias chained this one near the Glades and drove it up the ridge in a storm. The Wardens turned him back, and he let it go and hid in shame. It still comes by his cabin for supper. Its case in the museum waits for the carving he never finished.',
  },
};
