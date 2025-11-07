
export const ICONS = {
  DATA: "cellular-outline",
  AIRTIME: "call-outline",
  ELECTRICITY: "flash-outline",
  CABLE: "tv-outline",
  SUPPORT: "headset-outline",
  REFERRAL: "gift-outline",
  EDUCATION: "school-outline",
} as const;


export const sections = [
  {
    title: "Account",
    items: [
      "Change Email",
      "Change Password",
      "Change Transaction PIN",
      "Delete Account",
    ],
  },
  {
    title: "Preferences",
    items: ["Notifications"],
  },

  {
    title: "Legal",
    items: ["Privacy Policy", "Terms of Service"],
  },
];

export const availableThemes = [
  "dark",
];

export const NETWORK_IMAGES: { [key: string]: string } = {
  "9MOBILE": "/sp-9mobile.jpeg",
  AIRTEL: "/sp-airtel-logo.jpeg",
  GLO: "/sp-glo_logo.png",
  MTN: "/sp-mtn-logo.jpeg",
};

export const EXAM_IMAGES: { [key: string]: string } = {
  WAEC: "/ex-waec_logo.png",
  NECO: "/ex-neco-logo.png",
  NABTEB: "/ex-nabteb-logo.png",
};

export const DEFAULT_PROVIDER_IMAGE = "/edgesnetworkicon.png";

interface DiscosProvider {
  id: number;
  title: string;
  name: string;
  image: any;
  code: string;
  discoCode: string;
}

export const METER_TYPES = [
  { label: "Prepaid", value: "prepaid" },
  { label: "Postpaid", value: "postpaid" },
];

// Disco providers configuration
export const DISCO_PROVIDERS: DiscosProvider[] = [
  {
    id: 1,
    title: "IKEDC",
    name:"IKEDC",
    image: "/sp-ikedc-logo.png",
    code: "ikedc",
    discoCode: "ikeja_electric",
  },
  {
    id: 2,
    title: "Eko Electricity",
    name:"EKO",
    image:
      "/sp-eeedc-logo.jpeg",
    code: "EKO",
    discoCode: "2",
  },
  {
    id: 3,
    title: "Kano Electricity",
    name:"KANO",
    image:
      "/sp-kedco-logo.jpeg",
    code: "KANO",
    discoCode: "3",
  },
  {
    id: 4,
    title: "Port Harcourt Electricity",
    name:"PH",
    image: "/sp-phedc-logo.png",
    code: "PH",
    discoCode: "4",
  },
  {
    id: 5,
    title: "Jos Electricity",
    name:"JOS",
    image: "/sp-jedc-logo.jpeg",
    code: "JOS",
    discoCode: "5",
  },
  {
    id: 6,
    title: "Ibadan Electricity",
    name:"IBADAN",
    image: "/sp-ibedc2-logo.png",
    code: "IBADAN",
    discoCode: "6",
  },
  {
    id: 7,
    title: "Kaduna Electric",
    name:"KADUNA",
    image:
      "/sp-kdedc-logo.png",
    code: "KADUNA",
    discoCode: "7",
  },
  {
    id: 8,
    title: "Abuja Electricity",
    name:"ABUJA",
    image:
      "/sp-aedc-logo.jpeg",
    code: "ABUJA",
    discoCode: "8",
  },
  {
    id: 9,
    title: "Enugu",
    name:"ENUGU",
    image:
      "/sp-eedc-logo.jpeg",
    code: "ENUGU",
    discoCode: "9",
  },
  {
    id: 10,
    title: "YEDC",
    name:"YEDC",
    image: "/sp-yedc-logo.png",
    code: "YEDC",
    discoCode: "10",
  },
  {
    id: 11,
    title: "BEDC",
    name:"BEDC",
    image:
      "/sp-bedc-logo.jpeg",
    code: "bedc",
    discoCode: "benin_electric",
  },
];

export const actions = [
  {
    title: "Buy Data",
    icon: ICONS.DATA,
    color: "#22C55E",
    route: "../data" as const,
  },
  {
    title: "Buy Airtime",
    icon: ICONS.AIRTIME,
    color: "#2563EB",
    route: "../airtime" as const,
  },
  {
    title: "Electricity",
    icon: ICONS.ELECTRICITY,
    color: "#EAB308",
    route: "../electric" as const,
  },
  {
    title: "Cable TV",
    icon: ICONS.CABLE,
    color: "#3B82F6",
    route: "../cable" as const,
  },
  {
    title: "Customer Care",
    icon: ICONS.SUPPORT,
    color: "#3B82F6",
    route: "../support" as const,
  },
  {
    title: "Education",
    icon: ICONS.EDUCATION,
    color: "#F472B6",
    route: "../education" as const,
  },
  // {
  // 	title: "Referral",
  // 	icon: ICONS.REFERRAL,
  // 	color: "#F59E0B",
  // 	route: "../referral" as const,
  // },
] satisfies Array<{
  title: string;
  icon: string;
  color: string;
  route: `/${string}` | `../${string}`;
}>;

