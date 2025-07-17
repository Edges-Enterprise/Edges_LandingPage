
'use client';

import { useMemo } from 'react';

export interface DataPlan {
  id: number;
  network: string;
  type: string;
  volume: string;
  price: string;
  validity: string;
  note?: string;
}

export const DataTable: React.FC = () => {
  const dataPlans: DataPlan[] = [
    { id: 199, network: 'AIRTEL', type: 'SME', volume: '60.0GB', price: '₦16,400.00', validity: '1 Month' },
    { id: 222, network: 'GLO', type: 'GIFTING', volume: '200MB', price: '₦100.00', validity: '14days' },
    { id: 223, network: 'GLO', type: 'GIFTING', volume: '1GB', price: '₦290.00', validity: '3days' },
    { id: 224, network: 'GLO', type: 'GIFTING', volume: '1GB', price: '₦335.00', validity: '7days' },
    { id: 225, network: 'GLO', type: 'GIFTING', volume: '3.0GB', price: '₦870.00', validity: '3days' },
    { id: 226, network: 'GLO', type: 'GIFTING', volume: '3.0GB', price: '₦990.00', validity: '7days' },
    { id: 227, network: 'GLO', type: 'GIFTING', volume: '5.0GB', price: '₦1,450.00', validity: '3days' },
    { id: 228, network: 'GLO', type: 'GIFTING', volume: '5.0GB', price: '₦1,675.00', validity: '7days' },
    { id: 229, network: 'MTN', type: 'GIFTING', volume: '3.5GB', price: '₦1,550.00', validity: '7days' },
    { id: 167, network: 'AIRTEL', type: 'GIFTING', volume: '1.5GB', price: '₦640.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 169, network: 'AIRTEL', type: 'GIFTING', volume: '7.0GB', price: '₦2,150.00', validity: '7days', note: 'Dont buy if the sim has airtime debt' },
    { id: 170, network: 'AIRTEL', type: 'GIFTING', volume: '10.0GB', price: '₦3,150.00', validity: '1 Month', note: 'Dont buy if the sim has airtime debt' },
    { id: 171, network: 'MTN', type: 'GIFTING', volume: '110MB', price: '₦110.00', validity: '1day' },
    { id: 175, network: 'MTN', type: 'GIFTING', volume: '1.5GB', price: '₦985.00', validity: '7days' },
    { id: 176, network: 'MTN', type: 'GIFTING', volume: '500MB', price: '₦365.00', validity: '1day' },
    { id: 178, network: 'MTN', type: 'COOPERATE GIFTING', volume: '500MB', price: '₦450.00', validity: '7days' },
    { id: 179, network: 'MTN', type: 'COOPERATE GIFTING', volume: '1.0GB', price: '₦800.00', validity: '1 Month' },
    { id: 180, network: 'MTN', type: 'COOPERATE GIFTING', volume: '2.0GB', price: '₦1,400.00', validity: '1 Month' },
    { id: 181, network: 'MTN', type: 'COOPERATE GIFTING', volume: '3.0GB', price: '₦2,100.00', validity: '1 Month' },
    { id: 182, network: 'MTN', type: 'COOPERATE GIFTING', volume: '5GB', price: '₦3,500.00', validity: '1 Month' },
    { id: 183, network: 'MTN', type: 'GIFTING', volume: '2.0GB', price: '₦1,500.00', validity: '1 Month', note: '+5mins call' },
    { id: 184, network: 'MTN', type: 'GIFTING', volume: '3.5GB', price: '₦2,500.00', validity: '1 Month', note: '+5mins call' },
    { id: 185, network: 'MTN', type: 'GIFTING', volume: '2.7GB', price: '₦1,985.00', validity: '1 Month', note: '+5mins call' },
    { id: 186, network: 'MTN', type: 'GIFTING', volume: '2.5GB', price: '₦935.00', validity: '2days' },
    { id: 187, network: 'MTN', type: 'GIFTING', volume: '5.0GB', price: '₦3,600.00', validity: '1 Month' },
    { id: 188, network: 'MTN', type: 'GIFTING', volume: '7.0GB', price: '₦3,650.00', validity: '1 Month' },
    { id: 189, network: 'MTN', type: 'GIFTING', volume: '10.0GB', price: '₦4,520.00', validity: '1 Month', note: '+10mins call' },
    { id: 190, network: 'MTN', type: 'GIFTING', volume: '20.0GB', price: '₦7,500.00', validity: '1 Month' },
    { id: 192, network: 'MTN', type: 'GIFTING', volume: '36.0GB', price: '₦11,500.00', validity: '1 Month' },
    { id: 194, network: 'MTN', type: 'GIFTING', volume: '90.0GB', price: '₦26,000.00', validity: '2 Months' },
    { id: 195, network: 'AIRTEL', type: 'SME', volume: '13.0GB', price: '₦5,300.00', validity: '1 Month' },
    { id: 196, network: 'AIRTEL', type: 'SME', volume: '18.0GB', price: '₦6,400.00', validity: '1 Month' },
    { id: 197, network: 'AIRTEL', type: 'SME', volume: '25.0GB', price: '₦8,600.00', validity: '1 Month' },
    { id: 198, network: 'AIRTEL', type: 'SME', volume: '35.0GB', price: '₦10,800.00', validity: '1 Month' },
    { id: 80, network: 'AIRTEL', type: 'SME', volume: '600MB', price: '₦238.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 81, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '300MB', price: '₦320.00', validity: '7days' },
    { id: 82, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '500MB', price: '₦498.00', validity: '7days' },
    { id: 83, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '1.0GB', price: '₦800.00', validity: '7days' },
    { id: 84, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '2.0GB', price: '₦1,600.00', validity: '1 Month' },
    { id: 85, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '4.0GB', price: '₦3,200.00', validity: '1 Month' },
    { id: 86, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '10.0GB', price: '₦6,000.00', validity: '1 Month' },
    { id: 87, network: 'AIRTEL', type: 'SME', volume: '1.0GB', price: '₦340.00', validity: '1day', note: 'Dont buy if the sim has airtime debt' },
    { id: 103, network: 'MTN', type: 'GIFTING', volume: '1.0GB', price: '₦495.00', validity: '24Hours', note: '+3mins' },
    { id: 114, network: 'MTN', type: 'GIFTING', volume: '1.5GB', price: '₦593.00', validity: '2 Days' },
    { id: 115, network: 'MTN', type: 'GIFTING', volume: '2.0GB', price: '₦750.00', validity: '2Days' },
    { id: 116, network: 'MTN', type: 'GIFTING', volume: '500MB', price: '₦495.00', validity: '7days' },
    { id: 117, network: 'MTN', type: 'GIFTING', volume: '3.2GB', price: '₦1,070.00', validity: '2Days' },
    { id: 118, network: 'MTN', type: 'GIFTING', volume: '1.2GB', price: '₦748.00', validity: '7days', note: 'MTN Pulse' },
    { id: 119, network: 'MTN', type: 'GIFTING', volume: '6.0GB', price: '₦2,485.00', validity: '7Days' },
    { id: 120, network: 'MTN', type: 'GIFTING', volume: '1.0GB', price: '₦786.00', validity: '7days' },
    { id: 133, network: 'AIRTEL', type: 'SME', volume: '1.0GB', price: '₦350.00', validity: '3days', note: 'Social Plan' },
    { id: 134, network: 'AIRTEL', type: 'SME', volume: '2GB', price: '₦580.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 135, network: 'AIRTEL', type: 'SME', volume: '4.0GB', price: '₦1,000.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 136, network: 'AIRTEL', type: 'SME', volume: '7.0GB', price: '₦2,120.00', validity: '7days', note: 'Dont buy if the sim has airtime debt' },
    { id: 137, network: 'AIRTEL', type: 'SME', volume: '10.0GB', price: '₦3,200.00', validity: '30days', note: 'Dont buy if the sim has airtime debt' },
    { id: 138, network: 'AIRTEL', type: 'SME', volume: '4.0GB', price: '₦1,200.00', validity: '2day', note: 'Dont buy if the sim has airtime debt' },
    { id: 140, network: 'AIRTEL', type: 'SME', volume: '200MB', price: '₦220.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 162, network: 'AIRTEL', type: 'GIFTING', volume: '150MB', price: '₦80.00', validity: '1day', note: 'Dont buy if the sim has airtime debt' },
    { id: 166, network: 'AIRTEL', type: 'GIFTING', volume: '1GB', price: '₦370.00', validity: '3days', note: 'Social plan' },
    { id: 13, network: 'GLO', type: 'COOPERATE GIFTING', volume: '200MB', price: '₦110.00', validity: '14Days' },
    { id: 14, network: 'GLO', type: 'COOPERATE GIFTING', volume: '500MB', price: '₦220.00', validity: '1 Month' },
    { id: 15, network: 'AIRTEL', type: 'SME', volume: '150MB', price: '₦90.00', validity: '1day', note: 'Dont buy if the sim has airtime debt' },
    { id: 16, network: 'AIRTEL', type: 'COOPERATE GIFTING', volume: '100MB', price: '₦150.00', validity: '1day' },
    { id: 17, network: 'MTN', type: 'GIFTING', volume: '230MB', price: '₦210.00', validity: '1Day' },
    { id: 19, network: 'GLO', type: 'COOPERATE GIFTING', volume: '1.0GB', price: '₦430.00', validity: '1 Month' },
    { id: 20, network: 'GLO', type: 'COOPERATE GIFTING', volume: '2.0GB', price: '₦860.00', validity: '1 Month' },
    { id: 21, network: 'GLO', type: 'COOPERATE GIFTING', volume: '3.0GB', price: '₦1,290.00', validity: '1 Month' },
    { id: 22, network: 'GLO', type: 'COOPERATE GIFTING', volume: '5.0GB', price: '₦2,150.00', validity: '1 Month' },
    { id: 23, network: 'GLO', type: 'COOPERATE GIFTING', volume: '10GB', price: '₦4,300.00', validity: '1 Month' },
    { id: 43, network: '9MOBILE', type: 'COOPERATE GIFTING', volume: '500MB', price: '₦180.00', validity: '1 Month' },
    { id: 44, network: '9MOBILE', type: 'COOPERATE GIFTING', volume: '1.0GB', price: '₦330.00', validity: '1 Month' },
    { id: 45, network: '9MOBILE', type: 'COOPERATE GIFTING', volume: '2.0GB', price: '₦660.00', validity: '1 Month' },
    { id: 46, network: '9MOBILE', type: 'COOPERATE GIFTING', volume: '3.0GB', price: '₦985.00', validity: '1 Month' },
    { id: 47, network: 'AIRTEL', type: 'SME', volume: '300MB', price: '₦125.00', validity: '2days', note: 'Dont buy if the sim has airtime debt' },
    { id: 48, network: 'MTN', type: 'GIFTING', volume: '750MB', price: '₦450.00', validity: '3days', note: 'If it fails, Migrate the sim to MTN Pulse' },
    { id: 52, network: 'GLO', type: 'SME', volume: '750MB', price: '₦220.00', validity: '24 Hours' },
    { id: 53, network: 'GLO', type: 'SME', volume: '1.5GB', price: '₦350.00', validity: '24 Hours' },
    { id: 54, network: 'GLO', type: 'SME', volume: '2.5GB', price: '₦500.00', validity: '2 days' },
    { id: 55, network: 'GLO', type: 'SME', volume: '10.0GB', price: '₦2,200.00', validity: '7 days' },
    { id: 64, network: 'MTN', type: 'SME', volume: '500MB', price: '₦450.00', validity: '30Days' },
    { id: 65, network: 'MTN', type: 'SME', volume: '1.0GB', price: '₦690.00', validity: '1 Month' },
    { id: 66, network: 'MTN', type: 'SME', volume: '2.0GB', price: '₦1,380.00', validity: '1 Month' },
    { id: 67, network: 'MTN', type: 'SME', volume: '3.0GB', price: '₦2,070.00', validity: '1 Month' },
    { id: 68, network: 'MTN', type: 'SME', volume: '5.0GB', price: '₦3,450.00', validity: '1 Month' },
  ];

  const filteredPlans = useMemo(() => {
    return {
      MTN: dataPlans.filter((plan) => plan.network === 'MTN'),
      AIRTEL: dataPlans.filter((plan) => plan.network === 'AIRTEL'),
      GLO: dataPlans.filter((plan) => plan.network === 'GLO'),
      '9MOBILE': dataPlans.filter((plan) => plan.network === '9MOBILE'),
    };
  }, []);

  return null; // This component is for data storage, not rendering
};

export default DataTable;
