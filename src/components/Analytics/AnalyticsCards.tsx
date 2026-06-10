import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { LucideIcon } from 'lucide-react';

export interface AnalyticsCardData {
  title: string;
  value: string | number;
  desc: string;
  icon: LucideIcon;
  color: string; // e.g. text-blue-600 bg-blue-50
}

interface AnalyticsCardsProps {
  cards: AnalyticsCardData[];
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ cards }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="analytics-grids">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <Card key={idx} id={`kpi-card-${idx}`} className="hover:shadow-md transition-shadow duration-150">
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`p-3 rounded-xl ${card.color} shrink-0`}>
                <IconComponent className="h-5 w-5" />
              </span>
              <div className="overflow-hidden">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {card.title}
                </span>
                <p className="text-2xl font-black text-slate-800 tracking-tight leading-tight mt-0.5">
                  {card.value}
                </p>
                <span className="text-[10px] text-slate-500 font-medium truncate block mt-1">
                  {card.desc}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AnalyticsCards;
