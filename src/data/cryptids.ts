/**
 * The complete 36-cryptid roster. Each entry carries exact spawn rules
 * (region / sub-zone / time / weather / summon), favourite lures, encounter
 * stances, temperament, special-mechanic traits and its specimen drop.
 */
import type { MapId } from './mapgen';
import type { TimeTag, Weather } from './weather';

export type Stance = 'AGITATED' | 'CURIOUS' | 'SPECTRAL' | 'PRIDEFUL' | 'SHY';
export type Temperament = 'skittish' | 'neutral' | 'predator' | 'territorial' | 'spectral';
export type Zone =
  | 'orchard' | 'springs' | 'lake' | 'deep' | 'canal' | 'sawmill' | 'roof' | 'timber'
  | 'crossroads' | 'cliffs' | 'slope' | 'summit';
export type Summon = 'totems' | 'chime' | 'rod';

/** Special encounter mechanics, resolved in src/engine/encounter.ts. */
export type Trait =
  | 'flashSpook' | 'lanternMesmer' | 'aggressive' | 'squonk' | 'thief' | 'mimicLove' | 'flashImmune'
  | 'bellBreath' | 'dodgeBait' | 'timer4' | 'slopeCrouch' | 'radioCalm' | 'odor' | 'foodImmune'
  | 'surfacing' | 'acoustic' | 'pukwudgie' | 'howl' | 'sulfur' | 'loudSpook' | 'fastStartle'
  | 'bellWeak' | 'stillness' | 'slowStartle' | 'crouch3' | 'scentDraw' | 'crouchHate' | 'flashLove'
  | 'feedFirst' | 'mistShield' | 'radioTune' | 'beast' | 'wendigo' | 'proud' | 'phaseOut' | 'vocal';

export interface CryptidDrop {
  id: string;
  name: string;
  desc: string;
  price: number;
}

export interface CryptidDef {
  id: string;
  num: number;
  name: string;
  tier: 1 | 2 | 3 | 4;
  maps: MapId[];
  /** If set, the encounter tile must lie in one of these sub-zones. */
  zones?: Zone[];
  times: TimeTag[] | 'ANY';
  weather: Weather[] | 'ANY';
  /** Ignores the time rule while a thunderstorm rages (The Awful). */
  stormAnyTime?: boolean;
  fullMoon?: boolean;
  summon?: Summon;
  /** Required 3-star Dex entries before it will appear. */
  requires?: string[];
  lures: string[];
  dislikes?: string[];
  stances: Stance[];
  temperament: Temperament;
  startStartle?: number;
  traits: Trait[];
  drop: CryptidDrop;
  look: string;
  notes: string;
}

const d = (id: string, name: string, desc: string, price: number): CryptidDrop => ({ id, name, desc, price });

export const CRYPTIDS: readonly CryptidDef[] = [
  // ---------------- Tier 1: Cabin perimeter, meadows & slopes ----------------
  {
    id: 'jackalope', num: 1, name: 'Jackalope', tier: 1, maps: ['PINE_TRAIL_AND_ORCHARD'], times: ['DAY', 'DUSK'], weather: 'ANY',
    lures: ['wild_clover'], stances: ['SHY', 'CURIOUS'], temperament: 'skittish', traits: ['flashSpook'],
    drop: d('jackalope_antler', 'Jackalope Antler Shed', 'A tiny forked antler, still velvety.', 60),
    look: 'A brown rabbit wearing a rack of pale antlers.',
    notes: 'Extremely skittish. An early Flash Photo sends it bolting; wait until Trust is high. Wild Clover wins it over fast.',
  },
  {
    id: 'nightcrawler', num: 2, name: 'Fresno Nightcrawler', tier: 1, maps: ['CABIN_YARD', 'PINE_TRAIL_AND_ORCHARD'], times: ['NIGHT'], weather: ['CLEAR', 'FOG'],
    lures: ['moonberry'], stances: ['SPECTRAL', 'SHY'], temperament: 'neutral', traits: ['lanternMesmer'],
    drop: d('silver_silk', 'Silver Silk', 'Gossamer thread shed from its fold-cloth. Prized by crafters.', 55),
    look: 'Two impossibly tall white legs beneath a folded, armless body.',
    notes: 'Mesmerized by a Dim Lantern. Strolls the cabin perimeter on clear or foggy nights.',
  },
  {
    id: 'hoop_snake', num: 3, name: 'Hoop Snake', tier: 1, maps: ['PINE_TRAIL_AND_ORCHARD'], times: ['DAY'], weather: ['CLEAR'],
    lures: ['sweet_sap'], stances: ['AGITATED'], temperament: 'territorial', traits: ['aggressive'],
    drop: d('hoop_ring', 'Hoop Snake Tail-Ring', 'A shed ring of scales, perfectly circular.', 50),
    look: 'A green snake biting its own tail, rolling like a wheel.',
    notes: 'Aggressive: its Startle climbs every turn unless you Hold Breath. Loves Sweet Sap.',
  },
  {
    id: 'squonk', num: 4, name: 'Squonk', tier: 1, maps: ['OLD_GROWTH_AND_SAWMILL'], times: 'ANY', weather: ['RAIN'],
    lures: ['wild_onion'], stances: ['SHY'], temperament: 'skittish', startStartle: 50, traits: ['squonk'],
    drop: d('squonk_tear', 'Squonk Tear Vial', 'A vial of salty tears. It cried the whole time.', 65),
    look: 'A drooping, warty pig-thing that weeps constantly.',
    notes: 'Starts half-startled and weeps louder each turn. A Quick Sketch is completely safe.',
  },
  {
    id: 'albatwitch', num: 5, name: 'Albatwitch', tier: 1, maps: ['PINE_TRAIL_AND_ORCHARD'], zones: ['orchard'], times: ['DUSK'], weather: 'ANY',
    lures: ['wild_apple', 'apple_cider'], stances: ['CURIOUS'], temperament: 'neutral', traits: ['thief', 'mimicLove'],
    drop: d('albatwitch_core', 'Gnawed Apple Core', 'Tiny teeth marks. Still sticky.', 40),
    look: 'A tiny hunched ape juggling a red apple.',
    notes: 'Haunts the Apple Grove at dusk. Steals your bait on turns you fail to impress it. Adores Mimic Call.',
  },
  {
    id: 'snarly_yow', num: 6, name: 'Snarly Yow', tier: 1, maps: ['PINE_TRAIL_AND_ORCHARD'], times: ['DUSK', 'NIGHT'], weather: 'ANY',
    lures: ['smoked_venison', 'iron_nail'], stances: ['AGITATED', 'SPECTRAL'], temperament: 'predator', traits: ['flashImmune', 'bellBreath'],
    drop: d('yow_tuft', 'Shadow-Hound Tuft', 'Black fur that never quite holds still.', 70),
    look: 'A massive spectral black hound with burning red eyes.',
    notes: 'Flash Photos pass right through it. Hold Breath, then ring a Brass Bell to solidify its Trust.',
  },
  {
    id: 'wampus_cat', num: 7, name: 'Wampus Cat', tier: 1, maps: ['PINE_TRAIL_AND_ORCHARD', 'RADIO_RIDGE_AND_CROSSROADS'], times: ['NIGHT'], weather: 'ANY',
    lures: ['catnip_mint'], stances: ['CURIOUS', 'AGITATED'], temperament: 'predator', traits: ['dodgeBait'],
    drop: d('wampus_claw', 'Wampus Claw', 'One of eighteen. It has plenty more.', 70),
    look: 'A six-legged rust-red panther with lantern eyes.',
    notes: 'Bats away bait unless you use Mimic Call first. Catnip Mint is irresistible afterward.',
  },
  {
    id: 'bolter', num: 8, name: 'Slide-Rock Bolter', tier: 1, maps: ['RADIO_RIDGE_AND_CROSSROADS'], zones: ['slope'], times: ['DAY', 'DUSK'], weather: ['RAIN'],
    lures: ['mineral_salt'], stances: ['AGITATED', 'SHY'], temperament: 'skittish', traits: ['timer4'],
    drop: d('bolter_hook', 'Bolter Tail Hook', 'A curved hook it uses to anchor to cliffs.', 75),
    look: 'A giant lizard hooked to the slope by its tail.',
    notes: 'Found on wet scree slopes. You have only 4 turns before it lets go and slides downhill.',
  },
  {
    id: 'wampahoofus', num: 9, name: 'Wampahoofus', tier: 1, maps: ['RADIO_RIDGE_AND_CROSSROADS'], times: ['DAY', 'DUSK'], weather: 'ANY',
    lures: ['wild_acorn'], stances: ['SHY', 'CURIOUS'], temperament: 'skittish', traits: ['slopeCrouch'],
    drop: d('wampa_tine', 'Wampahoofus Antler Tine', 'Grown crooked, like the beast.', 55),
    look: 'A deer-boar with short left legs and long right ones, built for hillsides.',
    notes: 'Crouch Step earns double Trust when you meet it on steep slope tiles.',
  },
  // ---------------- Tier 2: Bog, waterways & springs ----------------
  {
    id: 'loveland_frog', num: 10, name: 'Loveland Frog', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], times: ['DUSK', 'NIGHT'], weather: ['RAIN'],
    lures: ['swamp_moss'], stances: ['CURIOUS', 'SPECTRAL'], temperament: 'neutral', traits: ['radioCalm', 'vocal'],
    drop: d('frog_spark', 'Wand Spark Crystal', 'Still fizzes faintly when shaken.', 90),
    look: 'An upright frog in an amber vest, waving a sparking wand.',
    notes: 'Calmed instantly by a Static Radio. Comes out in the rain.',
  },
  {
    id: 'polliwog', num: 11, name: 'Bog Polliwog', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], times: 'ANY', weather: 'ANY',
    lures: ['cranberries', 'fermented_mash'], stances: ['CURIOUS'], temperament: 'neutral', traits: [],
    drop: d('bog_slime', 'Bog Slime', 'Cranberry-pink goo. Crafting ingredient.', 35),
    look: 'A cranberry-stained tadpole the size of a canoe.',
    notes: 'Gentle and common. Cranberries are its favorite. Drops Bog Slime.',
  },
  {
    id: 'skunk_ape', num: 12, name: 'Skunk Ape', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], times: ['DUSK', 'NIGHT'], weather: 'ANY',
    lures: ['fermented_mash'], stances: ['AGITATED', 'SHY'], temperament: 'territorial', traits: ['odor'],
    drop: d('skunk_hair', 'Matted Swamp Hair', 'Do not smell it. You will smell it.', 85),
    look: 'A shaggy swamp ape trailing visible green stink.',
    notes: 'Its odor raises Startle every turn unless you carry a Scent Mask.',
  },
  {
    id: 'altamaha', num: 13, name: 'Altamaha-ha', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], zones: ['lake'], times: ['DAY', 'DUSK'], weather: ['FOG', 'RAIN'],
    lures: ['smoked_fish', 'swamp_moss'], stances: ['SHY', 'CURIOUS'], temperament: 'skittish', traits: [],
    drop: d('altamaha_fin', 'Altamaha Fin Ray', 'A translucent green fin spine.', 90),
    look: 'A humped river serpent with fern-green fins.',
    notes: 'Undulates along the central lake on foggy or rainy days.',
  },
  {
    id: 'wisp', num: 14, name: "Will-o'-the-Wisp", tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], times: ['NIGHT'], weather: ['FOG', 'CLEAR'],
    lures: ['wisp_oil'], stances: ['SPECTRAL'], temperament: 'spectral', traits: ['foodImmune', 'phaseOut'],
    drop: d('wisp_ember', 'Wisp Ember', 'A cold flame trapped in a jar.', 95),
    look: 'A floating violet flame with a white-hot core.',
    notes: 'Ignores food. A Lantern Pulse (Dim Lantern) or Wisp-Light Oil draws it in. May phase out unless oil is used.',
  },
  {
    id: 'chessie', num: 15, name: 'Chessie', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], zones: ['deep'], times: ['DAY'], weather: ['FOG'],
    lures: ['swamp_moss'], stances: ['SHY'], temperament: 'skittish', traits: ['surfacing'],
    drop: d('chessie_scale', 'Chessie Ridge Scale', 'A dark-teal scale the size of a dinner plate.', 100),
    look: 'A long dark-teal serpent with a ridged neck.',
    notes: 'Surfaces every other turn. Crouch Step while it is submerged; photograph it when surfaced.',
  },
  {
    id: 'bessie', num: 16, name: 'Bessie', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], zones: ['canal'], times: ['DAY'], weather: ['CLEAR'],
    lures: ['sweet_corn'], stances: ['CURIOUS', 'PRIDEFUL'], temperament: 'neutral', traits: ['acoustic', 'vocal'],
    drop: d('bessie_barbel', 'Bessie Barbel Whisker', 'Long, amber, and surprisingly soft.', 95),
    look: 'A mossy serpent with amber barbels.',
    notes: 'Swims the old canal on clear days. An acoustic caller (Mimic Call) earns +35% Trust.',
  },
  {
    id: 'pukwudgie', num: 17, name: 'Pukwudgie', tier: 2, maps: ['PINE_TRAIL_AND_ORCHARD', 'CRANBERRY_BOG_AND_SPRINGS'], times: ['DUSK'], weather: 'ANY',
    lures: ['wild_honeycomb'], stances: ['CURIOUS', 'AGITATED'], temperament: 'territorial', traits: ['pukwudgie'],
    drop: d('pukwudgie_quill', 'Pukwudgie Quill', 'Sharp. Very sharp. Ow.', 80),
    look: 'A knee-high forest spirit bristling with white quills.',
    notes: 'Steals one item at the end of Turn 1 unless you feed it Wild Honeycomb first.',
  },
  {
    id: 'ozark_howler', num: 18, name: 'Ozark Howler', tier: 2, maps: ['RADIO_RIDGE_AND_CROSSROADS', 'OLD_GROWTH_AND_SAWMILL'], times: ['NIGHT'], weather: 'ANY',
    lures: ['smoked_venison'], stances: ['AGITATED', 'PRIDEFUL'], temperament: 'predator', traits: ['howl', 'vocal'],
    drop: d('howler_horn', 'Howler Horn Chip', 'A chip of ram horn, ringing faintly.', 100),
    look: 'A horned bear-cat whose roar ripples the air.',
    notes: 'Its howl adds +20% Startle each turn until countered by a Static Radio or Parabolic Dish.',
  },
  {
    id: 'slippery_skin', num: 19, name: 'Ole Slippery Skin', tier: 2, maps: ['CRANBERRY_BOG_AND_SPRINGS'], zones: ['springs'], times: ['DUSK', 'NIGHT'], weather: ['FOG', 'RAIN'],
    lures: ['sulfur_egg', 'mineral_salt'], stances: ['AGITATED', 'SHY'], temperament: 'territorial', traits: ['sulfur'],
    drop: d('slippery_oil', 'Slick Bear Oil', 'An iridescent oil that beads on everything.', 95),
    look: 'An oil-sheened black bear dripping spring water and sulfur fumes.',
    notes: 'Lurks in the Mineral Springs. A Scent Mask is needed to block the sulfur fumes.',
  },
  // ---------------- Tier 3: Old Growth & Abandoned Sawmill ----------------
  {
    id: 'mothman', num: 20, name: 'Mothman', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], zones: ['sawmill', 'roof', 'timber'], times: ['NIGHT'], weather: ['FOG', 'CLEAR'],
    lures: ['ghost_pepper'], stances: ['SHY', 'SPECTRAL'], temperament: 'skittish', traits: ['loudSpook'],
    drop: d('moth_scale', 'Moth Scale', 'Iridescent dust-scale. Dwayyos can smell it.', 130),
    look: 'A winged black silhouette with glowing red eyes.',
    notes: 'Haunts the sawmill. Loud sounds (bells, radio, calls) spook it badly. Use the Dim Lantern.',
  },
  {
    id: 'jersey_devil', num: 21, name: 'Jersey Devil', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL', 'PINE_TRAIL_AND_ORCHARD'], times: ['NIGHT'], weather: 'ANY',
    lures: ['charred_wood', 'smoked_venison'], stances: ['AGITATED', 'PRIDEFUL'], temperament: 'predator', traits: ['fastStartle'],
    drop: d('devil_membrane', 'Devil Wing Membrane', 'Leathery and warm. Smells of brimstone.', 140),
    look: 'A horse-headed, bat-winged terror of the Barrens.',
    notes: 'Startle climbs 50% faster than usual. Move decisively.',
  },
  {
    id: 'snallygaster', num: 22, name: 'Snallygaster', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], zones: ['roof'], times: ['DUSK'], weather: 'ANY',
    lures: ['fermented_mash'], stances: ['AGITATED'], temperament: 'predator', traits: ['bellWeak'],
    drop: d('snally_beak', 'Snallygaster Beak Shard', 'Metal-hard. Dwayyos can smell it.', 140),
    look: 'A winged reptile with a steel beak and dangling red tentacles.',
    notes: 'Perches on the collapsed sawmill roof at dusk. Weak to Brass Bells and Static Radios.',
  },
  {
    id: 'dover_demon', num: 23, name: 'Dover Demon', tier: 3, maps: ['PINE_TRAIL_AND_ORCHARD'], times: ['NIGHT'], weather: 'ANY',
    lures: ['glow_shroom'], stances: ['CURIOUS', 'SHY'], temperament: 'skittish', traits: ['stillness'],
    drop: d('dover_print', 'Long-Finger Print', 'A plaster print of impossibly long fingers.', 120),
    look: 'A spindly peach-tan biped with an enormous head.',
    notes: 'Movement (Crouch Step) lowers its Trust. Hold Breath, then show the Dim Lantern.',
  },
  {
    id: 'grafton', num: 24, name: 'Grafton Monster', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], zones: ['sawmill'], times: 'ANY', weather: ['FOG'],
    lures: ['mineral_salt'], stances: ['SHY'], temperament: 'neutral', traits: ['slowStartle', 'crouch3'],
    drop: d('grafton_hide', 'Pale Hide Strip', 'Smooth, cold, and faintly blue.', 125),
    look: 'A broad, headless, pale hulk.',
    notes: 'Slow to startle, but Trust stalls at 60% until you have Crouch Stepped for 3 turns.',
  },
  {
    id: 'dwayyo', num: 25, name: 'Dwayyo', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], times: ['NIGHT'], weather: 'ANY',
    lures: ['smoked_venison'], stances: ['AGITATED', 'CURIOUS'], temperament: 'predator', traits: ['scentDraw'],
    drop: d('dwayyo_fang', 'Dwayyo Fang', 'Long, yellowed, and still sharp.', 135),
    look: 'An upright dark-red wolf with lantern-yellow fangs.',
    notes: 'Appears far more often when you carry a Moth Scale or Snallygaster Beak Shard.',
  },
  {
    id: 'hodag', num: 26, name: 'Hodag', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], zones: ['timber'], times: ['NIGHT'], weather: 'ANY',
    lures: ['charred_wood'], stances: ['AGITATED', 'PRIDEFUL'], temperament: 'territorial', traits: ['crouchHate'],
    drop: d('hodag_spine', 'Hodag Spine', 'A curved dorsal spike, warm to the touch.', 130),
    look: 'A spiny reptilian bulldog snorting steam.',
    notes: 'Territorial: Crouch Step creeping closer raises Startle. Toss bait from afar.',
  },
  {
    id: 'hopkinsville_goblin', num: 27, name: 'Hopkinsville Goblin', tier: 3, maps: ['RADIO_RIDGE_AND_CROSSROADS'], times: ['NIGHT'], weather: 'ANY',
    lures: ['battery_pack'], stances: ['CURIOUS'], temperament: 'skittish', traits: ['flashLove'],
    drop: d('goblin_alloy', 'Strange Alloy Shard', 'Silver-green metal no lab can identify.', 130),
    look: 'A small silver-green figure with huge pointed ears.',
    notes: 'Immune to flash startle. Flash Photo actually increases its Trust!',
  },
  {
    id: 'pigman', num: 28, name: 'Pigman of Northfield', tier: 3, maps: ['OLD_GROWTH_AND_SAWMILL'], zones: ['sawmill'], times: ['NIGHT'], weather: 'ANY',
    lures: ['sweet_corn', 'fermented_mash'], stances: ['AGITATED', 'SHY'], temperament: 'territorial', traits: ['feedFirst'],
    drop: d('pigman_button', 'Overall Button', 'A brass button from tattered overalls.', 120),
    look: 'A hulking biped in tattered overalls with a pale porcine snout.',
    notes: 'Feed it bait before using Crouch Step or Flash Photo, or it panics.',
  },
  // ---------------- Tier 4: Mythics ----------------
  {
    id: 'flatwoods', num: 29, name: 'Flatwoods Monster', tier: 4, maps: ['RADIO_RIDGE_AND_CROSSROADS'], times: ['NIGHT'], weather: ['FOG'],
    lures: ['battery_pack'], stances: ['SPECTRAL', 'PRIDEFUL'], temperament: 'spectral', traits: ['mistShield', 'phaseOut'],
    drop: d('flatwoods_residue', 'Oily Mist Residue', 'Smells metallic. Burns slightly.', 220),
    look: 'An armored skirt and spade cowl around glowing red eyes.',
    notes: 'A mist shield halves all Trust gains unless you carry a Thermal Lens or Mothman Goggles.',
  },
  {
    id: 'sasquatch', num: 30, name: 'Sasquatch (Elder)', tier: 4, maps: ['OLD_GROWTH_AND_SAWMILL'], times: ['DUSK'], weather: 'ANY', summon: 'totems',
    lures: ['wild_honeycomb', 'wild_apple'], stances: ['SHY', 'CURIOUS', 'PRIDEFUL'], temperament: 'neutral', traits: [],
    drop: d('sasquatch_hair', 'Elder Hair Lock', 'Coarse, umber, and nearly a meter long.', 260),
    look: 'A towering dark-umber figure with amber eyes.',
    notes: 'Summoned by placing 3 Wooden Lure Totems in the Old Growth, then visiting one at dusk.',
  },
  {
    id: 'thunderbird', num: 31, name: 'Thunderbird', tier: 4, maps: ['RADIO_RIDGE_AND_CROSSROADS'], times: 'ANY', weather: ['STORM'], summon: 'rod',
    lures: ['foraged_meat', 'smoked_fish'], stances: ['PRIDEFUL', 'AGITATED'], temperament: 'predator', traits: ['vocal'],
    drop: d('static_feather', 'Static Feather', 'Crackles in your hand. Crafting ingredient.', 250),
    look: 'A vast storm-blue wingspan crested with lightning.',
    notes: 'Rides thunderstorms over Radio Ridge. A Copper Lightning Rod calls it down.',
  },
  {
    id: 'indrid_cold', num: 32, name: 'Indrid Cold', tier: 4, maps: ['RADIO_RIDGE_AND_CROSSROADS'], zones: ['crossroads'], times: ['WITCHING'], weather: ['CLEAR', 'FOG'],
    lures: ['battery_pack'], stances: ['SPECTRAL', 'CURIOUS'], temperament: 'spectral', traits: ['radioTune', 'phaseOut'],
    drop: d('shimmer_thread', 'Shimmer Suit Thread', 'Iridescent green. Hums at 3 AM.', 260),
    look: 'A man in a shimmering green suit with a shadow face and a wide grin.',
    notes: 'Waits at the Crossroads in the Witching Hour. Tune a Static Radio to raise its Trust.',
  },
  {
    id: 'bray_road', num: 33, name: 'Beast of Bray Road', tier: 4, maps: ['OLD_GROWTH_AND_SAWMILL'], times: ['NIGHT'], weather: 'ANY', fullMoon: true,
    lures: ['smoked_venison'], stances: ['AGITATED', 'PRIDEFUL'], temperament: 'predator', traits: ['beast'],
    drop: d('bray_claw', 'Werewolf Claw', 'Hooked and silver-scarred.', 270),
    look: 'A muscular wolf-man with lantern fangs.',
    notes: 'Only under a full moon. Calm it with Brimstone Incense, or Hold Breath then ring a Silver Bell.',
  },
  {
    id: 'wendigo', num: 34, name: 'Wendigo', tier: 4, maps: ['OLD_GROWTH_AND_SAWMILL'], times: ['WITCHING'], weather: ['FOG', 'SNOW'], summon: 'chime',
    lures: ['smoked_venison'], stances: ['AGITATED', 'SPECTRAL'], temperament: 'predator', traits: ['wendigo'],
    drop: d('frost_rim_antler', 'Frost-Rim Antler', 'Rimed with ice that never melts. Crafting ingredient.', 300),
    look: 'A gaunt, skeletal silhouette crowned with antlers.',
    notes: 'Summoned by a Bone & Antler Chime. Hold Breath when its eyes flare red; toss Smoked Venison when they dim.',
  },
  {
    id: 'weaver', num: 35, name: 'The Weaver (Fresno Elder)', tier: 4, maps: ['RADIO_RIDGE_AND_CROSSROADS'], zones: ['crossroads'], times: ['WITCHING'], weather: ['FOG'],
    requires: ['nightcrawler', 'wisp'],
    lures: ['lunar_dew', 'moonberry'], stances: ['SPECTRAL', 'PRIDEFUL'], temperament: 'spectral', traits: ['phaseOut'],
    drop: d('weaver_ribbon', "Weaver's Silk Ribbon", 'A moonlit ribbon woven with runes.', 320),
    look: 'A towering cloaked patriarch trailing silk ribbons.',
    notes: 'Appears only to those with 3-Star entries for the Fresno Nightcrawler and the Will-o-the-Wisp.',
  },
  {
    id: 'awful', num: 36, name: 'The Awful', tier: 4, maps: ['RADIO_RIDGE_AND_CROSSROADS'], zones: ['cliffs'], times: ['DAWN'], weather: 'ANY', stormAnyTime: true,
    lures: ['smoked_venison'], stances: ['PRIDEFUL'], temperament: 'predator', traits: ['proud', 'vocal'],
    drop: d('awful_talon', 'Awful Talon', 'A crimson talon longer than your hand.', 300),
    look: 'A griffin-like beast: lion body, eagle head and vast wings.',
    notes: 'Proud: cowering (Hold Breath) lowers Trust. Stand your ground with a Brass Bell or Parabolic Dish.',
  },
];

export const CRYPTID_BY_ID: Record<string, CryptidDef> = Object.fromEntries(CRYPTIDS.map((c) => [c.id, c]));

export type Variant = 'normal' | 'albino' | 'static';

/** Signals that counter each stance (correct counter = big Trust, Startle relief). */
export const STANCE_COUNTERS: Record<Stance, string[]> = {
  AGITATED: ['brass_bell', 'static_radio', 'silver_bell'],
  CURIOUS: ['mimic_call', 'parabolic_dish'],
  SPECTRAL: ['dim_lantern', 'silver_bell', 'static_radio'],
  PRIDEFUL: ['brass_bell', 'parabolic_dish'],
  SHY: ['dim_lantern'],
};

export const TIER_WEIGHT: Record<number, number> = { 1: 10, 2: 6, 3: 3, 4: 1.2 };
