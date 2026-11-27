/**
 * The Town Restoration Ledger: four projects the town pays for together, with
 * materials and coins you put in. Open it at the Historical Society lectern or
 * the Porch Workbench. The 32-donation County Grant matches what the town
 * raises, halving the coins every unfunded project still needs.
 */
export type ProjectId = 'neon' | 'station' | 'gazebo' | 'mine';

export interface Project {
  id: ProjectId;
  /** Story flag set once it's funded. */
  flag: string;
  num: string;
  title: string;
  mats: Array<[string, number]>;
  gold: number;
  /** What it does, shown before you fund it. */
  pitch: string;
  /** Played when it's done. */
  done: string[];
}

export const PROJECTS: readonly Project[] = [
  {
    id: 'neon', flag: 'proj_neon', num: 'P1', title: 'Diner Neon',
    mats: [['scrap_copper', 3], ['glow_shroom', 1]], gold: 150,
    pitch: 'Rewire the Whistle-Stop\'s EAT sign so it glows from dusk on. Mabel would start Friday Night Story Hour again: 6 to 9 PM, friendship counts double at the diner.',
    done: [
      'Gideon solders, Toby holds the ladder, and Mabel stands in the street with her arms crossed until the sign buzzes, flickers, and lights: E A T, all three letters, for the first time in eleven years.',
      'MABEL: "Well. I suppose I\'ll have to put the coffee on Fridays again." She is trying very hard not to cry. "Story Hour. Six o\'clock. Bring somebody."',
      '(Fridays 6-9 PM: Story Hour at the diner. Chats and gifts there count double.)',
    ],
  },
  {
    id: 'station', flag: 'proj_station', num: 'P2', title: 'Station Roof & Signal Lamp',
    mats: [['timber', 10], ['iron_nail', 5]], gold: 300,
    pitch: 'Patch the station roof and rewire the C&O signal lantern. Barney could run the handcar late (dusk to midnight), and the Traveling Merchants would come in by rail on foggy weekends.',
    done: [
      'A week of hammering. New tin on the station roof, fresh paint on the waiting-room door, and at dusk Barney throws the switch on the signal lantern. It burns a steady red down the whole length of the line.',
      'BARNEY: "Highball, Ranger. That means the line\'s clear." He has to blow his nose. "I\'ll run the handcar till midnight. Somebody ought to."',
      '(Handcar runs until midnight. Traveling Merchants visit the station on foggy weekend afternoons.)',
    ],
  },
  {
    id: 'gazebo', flag: 'proj_gazebo', num: 'P3', title: 'Park Gazebo',
    mats: [['timber', 12], ['crushed_quartz', 4]], gold: 450,
    pitch: 'Raise a lantern-lit gazebo on the west lawn of the Town Park. Sunday afternoons the town would bring out fiddles and banjos, and a rest in the gazebo restores you fully.',
    done: [
      'The whole town turns out for the raising: Gideon on the ridgepole, Pippa and Sam handing up pegs, Ruth directing everybody from a lawn chair. By evening there are lanterns strung all round the eaves.',
      'RUTH: "Sundays, we play. That\'s how it was, and that\'s how it\'s going to be again." She pats the rail. "Earl would\'ve liked this."',
      '(Sunday afternoons 1-5 PM: porch music in the park. Sit in the gazebo once a Sunday to restore all your stamina.)',
    ],
  },
  {
    id: 'mine', flag: 'mine_open', num: 'P4', title: 'Mine & Lamp House',
    mats: [['iron_nail', 5]], gold: 500,
    pitch: 'Re-light the No. 3 lamp house and take the boards off the mine gate, so the town can finally go and bring its people\'s names back up. Needs Gideon\'s Lamp-House Key, and the story\'s end.',
    done: [
      'Gideon turns the old key. The lamp-house door groans open on rows of brass checks, still hanging where the men left them. One by one they take them down. Opa Walter, who has not been up this hill since \'78, reaches for 312, his own, and holds it a long time. Agnes takes Danny\'s, 118.',
      'The lamps come on. Then the boards come off the gate, and cool air breathes out of the hill, and somewhere far down in the dark, very faintly, something hums.',
      '(The mine gate is open. The tunnels are still being shored up: the underground expansion opens in a future update.)',
    ],
  },
];

export const PROJECT_BY_ID: Record<ProjectId, Project> = Object.fromEntries(PROJECTS.map((p) => [p.id, p])) as Record<ProjectId, Project>;

/** The gazebo's footprint on the Town Park's west lawn (3 wide, 2 deep; anchor bottom-left). */
export const GAZEBO = { x: 26, y: 28, w: 3, h: 2 };
