import type { ComponentProps } from 'react';
import { Layers, Smartphone } from 'lucide-react';
import { cn } from './cn';
import { stackTileStyle } from './stackMeta';
import type { PlatformKey } from '../types/domain';

/**
 * One mark per stack, from the stack's own world: the Flutter wing, the Apple,
 * the Android head, the Kotlin K. The brand paths are Simple Icons (CC0);
 * the two lucide glyphs cover the stacks that have no logo — "Mobile" is the
 * topics every stack shares, "Every stack" is all of them at once.
 *
 * `--stack-*` in index.css is the colour that goes with each mark; the
 * classes and styles that apply it live in lib/stackMeta.ts.
 */
type SvgProps = ComponentProps<'svg'>;

const brand = (d: string) => function BrandIcon({ className, ...props }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className} {...props}>
      <path d={d} />
    </svg>
  );
};

const FlutterIcon = brand('M14.314 0L2.3 12 6 15.7 21.684.013h-7.357zm.014 11.072L7.857 17.53l6.47 6.47H21.7l-6.46-6.468 6.46-6.46h-7.37z');
const AppleIcon = brand('M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701');
const AndroidIcon = brand('M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z');
// The K sits in a square; drawn at 80% so it has the same air as the others.
const KotlinIcon = brand('M21.6 21.6H2.4V2.4h19.2L12 12Z');

function MobileIcon({ className, ...props }: SvgProps) {
  return <Smartphone className={className} strokeWidth={2} aria-hidden {...(props as ComponentProps<typeof Smartphone>)} />;
}
function AllIcon({ className, ...props }: SvgProps) {
  return <Layers className={className} strokeWidth={2} aria-hidden {...(props as ComponentProps<typeof Layers>)} />;
}

const STACK_ICONS: Record<PlatformKey, (props: SvgProps) => JSX.Element> = {
  flutter: FlutterIcon,
  ios: AppleIcon,
  android: AndroidIcon,
  cross: KotlinIcon,
  mobile: MobileIcon,
  all: AllIcon,
};

export interface StackIconProps extends SvgProps {
  stack: PlatformKey;
}

/** The bare mark, in `currentColor`. */
export function StackIcon({ stack, className, ...props }: StackIconProps) {
  const Icon = STACK_ICONS[stack];
  return <Icon className={className} {...props} />;
}

const TILE_SIZES = {
  xs: 'h-5 w-5 rounded-[6px] [&>svg]:h-3 [&>svg]:w-3',
  sm: 'h-7 w-7 rounded-[8px] [&>svg]:h-[15px] [&>svg]:w-[15px]',
  md: 'h-9 w-9 rounded-[10px] [&>svg]:h-[19px] [&>svg]:w-[19px]',
  lg: 'h-12 w-12 rounded-[14px] [&>svg]:h-6 [&>svg]:w-6',
  xl: 'h-14 w-14 rounded-2xl [&>svg]:h-7 [&>svg]:w-7',
} as const;

export interface StackTileProps {
  stack: PlatformKey;
  size?: keyof typeof TILE_SIZES;
  /** `solid` is the identity mark; `soft` is the tinted tile for a list. */
  tone?: 'solid' | 'soft';
  className?: string;
}

/** The stack's mark on a rounded square in the stack's colour. */
export function StackTile({ stack, size = 'md', tone = 'solid', className }: StackTileProps) {
  return (
    <span
      aria-hidden
      className={cn('stack-tile', tone === 'soft' && 'stack-tile--soft', TILE_SIZES[size], className)}
      style={stackTileStyle(stack)}
    >
      <StackIcon stack={stack} />
    </span>
  );
}
