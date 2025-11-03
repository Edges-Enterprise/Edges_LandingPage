
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
  // "light",
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
  name: string;
  image: any;
  code: string;
  discoCode: string;
}

// Disco providers configuration
export const DISCO_PROVIDERS: DiscosProvider[] = [
  {
    id: 1,
    name: "IKEDC",
    image: "https://asset.brandfetch.io/idOw3g-pG6/idHFnOXwNA.png",
    code: "ikedc",
    discoCode: "ikeja_electric",
  },
  {
    id: 2,
    name: "Eko Electricity",
    image:
      "https://cdn.brandfetch.io/idzLCSOXXk/w/600/h/600/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
    code: "EKO",
    discoCode: "2",
  },
  {
    id: 3,
    name: "Kano Electricity",
    image:
      "https://cdn.brandfetch.io/idcsdEcy1X/w/1070/h/1053/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
    code: "KANO",
    discoCode: "3",
  },
  {
    id: 4,
    name: "Port Harcourt Electricity",
    image: "https://phed.com.ng/assets/image001.png",
    code: "PH",
    discoCode: "4",
  },
  {
    id: 5,
    name: "Jos Electricity",
    image: "https://asset.brandfetch.io/idjO0Tab3U/id4n6HL2V1.jpeg",
    code: "JOS",
    discoCode: "5",
  },
  {
    id: 6,
    name: "Ibadan Electricity",
    image: "https://www.ibedc.com/assets/img/logo.png",
    code: "IBADAN",
    discoCode: "6",
  },
  {
    id: 7,
    name: "Kaduna Electric",
    image:
      "https://cdn.brandfetch.io/idOe0sCI5j/w/600/h/523/theme/dark/logo.png?c=1bxideym1bCk82mxFsjUw",
    code: "KADUNA",
    discoCode: "7",
  },
  {
    id: 8,
    name: "Abuja Electricity",
    image:
      "https://cdn.brandfetch.io/idansu164B/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
    code: "ABUJA",
    discoCode: "8",
  },
  {
    id: 9,
    name: "Enugu",
    image:
      "https://cdn.brandfetch.io/id7rRpOe2k/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
    code: "ENUGU",
    discoCode: "9",
  },
  {
    id: 10,
    name: "YEDC",
    image: "https://www.yedc.com.ng/assets/images/logo.png",
    code: "YEDC",
    discoCode: "10",
  },
  {
    id: 11,
    name: "BEDC",
    image:
      "https://cdn.brandfetch.io/iduapK6_IF/w/400/h/400/theme/dark/icon.jpeg?c=1bxideym1bCk82mxFsjUw",
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
    route: "../customer" as const,
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

