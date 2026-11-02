import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  className,
}) => {
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={cn('space-y-3 font-body', className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-[#A87FE8]/20 bg-[#0D0A18]/60 overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-semibold text-[#F8F5FF] hover:bg-white/5 transition-colors"
            >
              <span>{item.title}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#A87FE8] transition-transform duration-300',
                  isOpen && 'rotate-180'
                )}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-xs text-[#F8F5FF]/80 leading-relaxed border-t border-white/5">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
