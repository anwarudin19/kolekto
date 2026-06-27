import {
  LayoutDashboard, Receipt, Inbox, Users, BarChart3, Wallet,
  Sparkles, Calendar, History, Bell, Shield, Smartphone,
  User, Settings, Search, Plus, Download, ChevronRight,
  ChevronDown, Menu, X, Check, Copy, Link2, Building2,
  Banknote, ArrowUp, Minus, RefreshCw, AlertCircle,
  CheckCircle2, Clock, Eye, EyeOff, Edit, Trash2, Filter,
  FileText, Upload, ExternalLink, LogOut, Lock,
  Globe, Star, Zap, Mail, Send, ArrowLeft, type LucideProps,
} from 'lucide-react';

const ICONS = {
  dashboard:    LayoutDashboard,
  receipt:      Receipt,
  inbox:        Inbox,
  users:        Users,
  reports:      BarChart3,
  sort:         BarChart3,
  wallet:       Wallet,
  sparkle:      Sparkles,
  calendar:     Calendar,
  history:      History,
  bell:         Bell,
  shield:       Shield,
  phone:        Smartphone,
  user:         User,
  settings:     Settings,
  search:       Search,
  plus:         Plus,
  download:     Download,
  chev:         ChevronRight,
  chevDown:     ChevronDown,
  menu:         Menu,
  x:            X,
  check:        Check,
  copy:         Copy,
  link:         Link2,
  bank:         Building2,
  cash:         Banknote,
  arrUp:        ArrowUp,
  minus:        Minus,
  refresh:      RefreshCw,
  alert:        AlertCircle,
  checkCircle:  CheckCircle2,
  clock:        Clock,
  eye:          Eye,
  'eye-off':    EyeOff,
  edit:         Edit,
  trash:        Trash2,
  filter:       Filter,
  file:         FileText,
  upload:       Upload,
  external:     ExternalLink,
  logout:       LogOut,
  lock:         Lock,
  globe:        Globe,
  star:         Star,
  zap:          Zap,
  mail:         Mail,
  send:         Send,
  'arrow-left': ArrowLeft,
} as const;

export type IconName = keyof typeof ICONS;

type Props = LucideProps & { name: IconName };

export function Icon({ name, size = 16, ...props }: Props) {
  const Component = ICONS[name];
  return <Component size={size} strokeWidth={1.8} {...props} />;
}
