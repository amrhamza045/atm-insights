import React from 'react';
import { useLanguage } from './LanguageProvider';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          data-no-translate
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-slate-100' : ''}
        >
          EN English
        </DropdownMenuItem>
        <DropdownMenuItem 
          data-no-translate
          onClick={() => setLanguage('ar')}
          className={language === 'ar' ? 'bg-slate-100' : ''}
        >
          AR العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}