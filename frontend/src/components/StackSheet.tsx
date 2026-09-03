import FilterSheet from './FilterSheet';
import { StackRows } from './StackSwitcher';
import { useLang } from '../i18n/LangContext';
import { useT } from '../i18n/ui';

export interface StackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The stack list as a bottom sheet, for the phone header's pill. Loaded
 * lazily by MobileHeader so vaul stays out of the entry chunk until the
 * pill is first tapped.
 */
export default function StackSheet({ open, onOpenChange }: StackSheetProps) {
  const { lang } = useLang();
  const t = useT(lang);
  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.stackPickerTitle}
      description={t.stackPickerSubtitle}
      closeLabel={t.closeMenu}
    >
      <StackRows variant="sheet" source="mobile-header" onChosen={() => onOpenChange(false)} className="-mx-2 pb-2" />
    </FilterSheet>
  );
}
