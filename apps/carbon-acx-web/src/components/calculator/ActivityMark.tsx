import {
  AirVent,
  Beef,
  Bike,
  BusFront,
  Car,
  Droplets,
  Drumstick,
  Flame,
  Laptop,
  MessageCircleHeart,
  MonitorPlay,
  Music2,
  PlaneTakeoff,
  Refrigerator,
  Salad,
  Shirt,
  Smartphone,
  Sparkles,
  TrainFront,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { ActivityCategory } from '@/lib/calculator'

const paths: Record<ActivityCategory, ReactNode> = {
  transport: <path d="M3 15h18M5 15l2-8h10l2 8M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 4Z" />,
  food: <path d="M12 21V10M7 3v4a3 3 0 0 0 6 0V3M17 3v18M17 3c3 2 3 6 0 8" />,
  digital: <path d="M4 5h16v11H4zM9 20h6M12 16v4" />,
  home: <path d="m3 11 9-8 9 8v10H3zM9 21v-6h6v6" />,
  shopping: <path d="M5 8h14l-1 13H6zm4 0a3 3 0 0 1 6 0" />,
}

const activityIcons: Record<string, LucideIcon> = {
  'TRAN.SCHOOLRUN.CAR.KM': Car,
  'TRAN.SCHOOLRUN.BIKE.KM': Bike,
  'TRAN.TTC.SUBWAY.KM': TrainFront,
  'TRAN.TTC.BUS.KM': BusFront,
  'TRAN.FLIGHT.SHORTHAUL.PKM': PlaneTakeoff,
  'TRAN.FLIGHT.LONGHAUL.PKM': PlaneTakeoff,
  'FOOD.MEAL.BEEF.SERVING': Beef,
  'FOOD.MEAL.CHICKEN.SERVING': Drumstick,
  'FOOD.MEAL.VEG.SERVING': Salad,
  'MEDIA.STREAM.HD.HOUR': MonitorPlay,
  'MEDIA.STREAM.UHD.HOUR': MonitorPlay,
  'SOCIAL.INSTAGRAM.HOUR': MessageCircleHeart,
  'MUSIC.STREAM.STANDARD.HOUR': Music2,
  'AI.USAGE.GPT.QUERY': Sparkles,
  'ENERGY.NATGAS.M3': Flame,
  'MUNI.WATER.POTABLE.M3': Droplets,
  'REFR.APPL.FRIDGE.OP.YEAR': Refrigerator,
  'REFR.HVAC.AC.OP.YEAR': AirVent,
  'CLOTHING.TSHIRT.COTTON': Shirt,
  'CLOTHING.JEANS.DENIM': Shirt,
  'DEVICE.SMARTPHONE.UNIT': Smartphone,
  'DEVICE.LAPTOP.UNIT': Laptop,
}

export function ActivityMark({
  category,
  activityId,
  size = 24,
}: {
  category: ActivityCategory
  activityId?: string
  size?: number
}) {
  const Icon = activityId ? activityIcons[activityId] : undefined
  if (Icon) {
    return <Icon aria-hidden="true" className="activity-mark" size={size} strokeWidth={1.7} />
  }
  return <svg aria-hidden="true" className="activity-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{paths[category]}</svg>
}
