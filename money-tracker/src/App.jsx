import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_ACCOUNTS = ['BCA', 'BRI', 'Dana', 'Gopay'];
const APP_PASSWORD = '3003';
const FIRESTORE_COLLECTION = 'financeApps';
const FIRESTORE_DOCUMENT_ID = 'main-data';

// Format tanggal lokal (YYYY-MM-DD), tanpa toISOString agar tidak bergeser karena zona waktu
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;


const PERIOD_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: '7 hari terakhir' },
  { value: 'days30', label: '30 hari terakhir' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'lastMonth', label: 'Bulan lalu' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'custom', label: 'Custom date' }
];

// Mengembalikan [tanggalMulai, tanggalAkhir] (inklusif), atau [null, null] untuk "Semua"
const getPeriodRange = (period) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (period) {
    case 'today':
      return [toDateStr(now), toDateStr(now)];
    case 'week':
      return [toDateStr(new Date(y, m, now.getDate() - 6)), toDateStr(now)];
    case 'days30':
      return [toDateStr(new Date(y, m, now.getDate() - 29)), toDateStr(now)];
    case 'month':
      return [toDateStr(new Date(y, m, 1)), toDateStr(new Date(y, m + 1, 0))];
    case 'lastMonth':
      return [toDateStr(new Date(y, m - 1, 1)), toDateStr(new Date(y, m, 0))];
    case 'year':
      return [toDateStr(new Date(y, 0, 1)), toDateStr(new Date(y, 11, 31))];
    default:
      return [null, null];
  }
};

const ICONS = {
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  food: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </>
  ),
  film: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" />
    </>
  ),
  heart: (
    <>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </>
  ),
  cap: (
    <>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>
  ),
  briefcase: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </>
  ),
  trend: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  wallet: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  chart: (
    <>
      <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    </>
  ),
  loan: (
    <>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  transfer: <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />,
  arrowDown: <path d="M17 7 7 17M17 17H7V7" />,
  arrowUp: <path d="M7 7h10v10M7 17 17 7" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  )
};

const EXPENSE_CATEGORIES = [
  { name: 'Makanan', icon: 'food' },
  { name: 'Transport', icon: 'car' },
  { name: 'Belanja', icon: 'bag' },
  { name: 'Tagihan', icon: 'receipt' },
  { name: 'Hiburan', icon: 'film' },
  { name: 'Kesehatan', icon: 'heart' },
  { name: 'Pendidikan', icon: 'cap' },
  { name: 'Lainnya', icon: 'more' }
];

const INCOME_CATEGORIES = [
  { name: 'Gaji', icon: 'briefcase' },
  { name: 'Bonus', icon: 'gift' },
  { name: 'Investasi', icon: 'trend' },
  { name: 'Lainnya', icon: 'more' }
];

const LOAN_CATEGORY = { name: 'Pinjaman', icon: 'loan' };

// Sumbu grafik radar: semua kategori pengeluaran + pembayaran pinjaman
const RADAR_AXES = [...EXPENSE_CATEGORIES, LOAN_CATEGORY];

const CATEGORY_ICON = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, LOAN_CATEGORY].forEach((c) => {
  CATEGORY_ICON[c.name] = c.icon;
});

// Transaksi lama belum punya kategori -> dianggap "Lainnya". Transfer tidak punya kategori.
const getCategoryName = (t) => {
  if (t.type === 'transfer') return '';
  if (t.type === 'loanPayment') return LOAN_CATEGORY.name;
  return t.category || 'Lainnya';
};

const getTxIcon = (t) => {
  if (t.type === 'transfer') return 'transfer';
  return CATEGORY_ICON[getCategoryName(t)] || (t.type === 'income' ? 'arrowDown' : 'arrowUp');
};

function RadarChart({ items }) {
  const n = items.length;
  const max = Math.max(0, ...items.map((i) => i.value));
  const R = 27;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i, r) => [50 + r * Math.cos(angle(i)), 50 + r * Math.sin(angle(i))];
  const ring = (level) => items.map((_, i) => point(i, R * level).join(',')).join(' ');
  const shape = items
    .map((item, i) => point(i, max > 0 ? R * (item.value / max) : 0).join(','))
    .join(' ');

  return (
    <div className="relative w-full aspect-square">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon key={level} points={ring(level)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
        ))}
        {items.map((item, i) => {
          const [x, y] = point(i, R);
          return <line key={item.name} x1="50" y1="50" x2={x} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />;
        })}
        <polygon
          points={shape}
          fill="rgba(242,169,126,0.28)"
          stroke="#f2a97e"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {items.map((item, i) => {
          if (!(item.value > 0)) return null;
          const [x, y] = point(i, R * (item.value / max));
          return <circle key={item.name} cx={x} cy={y} r="0.9" fill="#f2a97e" />;
        })}
      </svg>

      {items.map((item, i) => {
        const [x, y] = point(i, 41);
        return (
          <div
            key={item.name}
            className="absolute flex flex-col items-center text-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Icon name={item.icon} className={`w-5 h-5 ${item.value > 0 ? 'text-peach' : 'text-white/30'}`} />
            <span className="mt-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-white/10 text-white/80">
              {item.percent}%
            </span>
            <span className="text-[9px] text-white/50 mt-0.5">{item.name}</span>
          </div>
        );
      })}
    </div>
  );
}

const WALLET_TINTS = ['from-emerald-300/25', 'from-peach/30', 'from-sky-300/25', 'from-violet-300/25'];

// Urut terbaru: tanggal terbesar dulu, lalu id terbesar
const sortByRecent = (a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id);

function SectionTitle({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex justify-between items-end mb-3">
      <div>
        <h3 className="font-serif text-lg leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
      </div>
      {onAction && (
        <button type="button" onClick={onAction} className="text-xs text-white/50">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Grafik area halus (dipakai di Home dan Report)
function AreaSpark({ values, id, className = 'w-full h-28' }) {
  if (!values.length) return null;

  const max = Math.max(0, ...values);
  const pts = values.length === 1 ? [values[0], values[0]] : values;
  const x = (i) => (pts.length > 1 ? (i / (pts.length - 1)) * 300 : 0);
  const y = (v) => 108 - (max > 0 ? (v / max) * 98 : 0);

  let line = '';
  pts.forEach((v, i) => {
    if (i === 0) {
      line = `M${x(i)},${y(v)}`;
    } else {
      const mx = (x(i - 1) + x(i)) / 2;
      line += ` C${mx},${y(pts[i - 1])} ${mx},${y(v)} ${x(i)},${y(v)}`;
    }
  });

  return (
    <svg viewBox="0 0 300 110" preserveAspectRatio="none" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2a97e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f2a97e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L300,110 L0,110 Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke="#f2a97e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function App() {
  const today = () => toDateStr(new Date());

  const firstDay = () => {
    const d = new Date();
    return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const lastDay = () => {
    const d = new Date();
    return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };

  const backupInputRef = useRef(null);

  // Tinggi layar sesungguhnya (menghindari salah hitung 100dvh di beberapa
  // browser mobile, terutama Chrome Android saat address bar/toolbar tampil).
  useEffect(() => {
    const setAppHeight = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
    };

    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    window.visualViewport?.addEventListener('resize', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
      window.visualViewport?.removeEventListener('resize', setAppHeight);
    };
  }, []);
const hasLoadedCloudData = useRef(false);

const [isCloudLoading, setIsCloudLoading] = useState(true);
const [cloudStatus, setCloudStatus] = useState('Menghubungkan ke Firestore...');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [activeTab, setActiveTab] = useState('home');
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('month');
  const [txStartDate, setTxStartDate] = useState(() => getPeriodRange('month')[0]);
  const [txEndDate, setTxEndDate] = useState(() => getPeriodRange('month')[1]);
  const [showDecimals, setShowDecimals] = useState(false);
  const [showGraph, setShowGraph] = useState(true);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  const [startDate, setStartDate] = useState(firstDay());
  const [endDate, setEndDate] = useState(lastDay());
  const [activeDetailCategory, setActiveDetailCategory] = useState(null);

  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [editingAccountName, setEditingAccountName] = useState('');
  const [editingLoanId, setEditingLoanId] = useState(null);

  const [accountName, setAccountName] = useState('');

  const [loanForm, setLoanForm] = useState({
    name: '',
    amount: '',
    date: today()
  });

  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    wallet: DEFAULT_ACCOUNTS[0],
    loanId: '',
    category: 'Lainnya',
    date: today()
  });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, type = 'success', subtitle = '') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, type, subtitle });
    toastTimer.current = setTimeout(() => setToast(null), 2300);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

useEffect(() => {
  const loadCloudData = async () => {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT_ID);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();

        setAccounts(Array.isArray(data.accounts) ? data.accounts : DEFAULT_ACCOUNTS);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setLoans(Array.isArray(data.loans) ? data.loans : []);
        setShowDecimals(Boolean(data.showDecimals));
        setUserName(typeof data.userName === 'string' ? data.userName : '');
      }

      hasLoadedCloudData.current = true;
      setCloudStatus('Data cloud siap');
    } catch (error) {
      console.error(error);
      setCloudStatus('Gagal mengambil data cloud');
    } finally {
      setIsCloudLoading(false);
    }
  };

  loadCloudData();
}, []);

useEffect(() => {
  if (!hasLoadedCloudData.current) return;

  const timeout = setTimeout(async () => {
    try {
      setCloudStatus('Menyimpan...');

      const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT_ID);

      await setDoc(
        docRef,
        {
          accounts,
          transactions,
          loans,
          showDecimals,
          userName,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setCloudStatus('Tersimpan di cloud');
    } catch (error) {
      console.error(error);
      setCloudStatus('Gagal menyimpan ke cloud');
    }
  }, 700);

  return () => clearTimeout(timeout);
}, [accounts, transactions, loans, showDecimals, userName]);
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('id-ID', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0
    });
  };

  const formatDateLabel = (value) => {
    if (!value) return '';
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const typeLabel = (type) => {
    if (type === 'income') return 'Income';
    if (type === 'expense') return 'Expense';
    if (type === 'loanPayment') return 'Pembayaran Pinjaman';
    return 'Transfer';
  };

  const typeColor = (type) => {
    if (type === 'income') return 'text-emerald-300';
    if (type === 'loanPayment') return 'text-violet-300';
    if (type === 'transfer') return 'text-white/60';
    return 'text-rose-300';
  };

  const typeIconStyle = (type) => {
    if (type === 'income') return 'bg-emerald-400/15 text-emerald-300';
    if (type === 'loanPayment') return 'bg-violet-400/15 text-violet-300';
    if (type === 'transfer') return 'bg-white/10 text-white/70';
    return 'bg-rose-400/15 text-rose-300';
  };

  const signed = (t) => {
    if (t.type === 'income') return '+ ';
    if (t.type === 'expense' || t.type === 'loanPayment') return '- ';
    return '';
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalBalance = totalIncome - totalExpenses;

  const [rangeStart, rangeEnd] =
    period === 'custom'
      ? [txStartDate || null, txEndDate || null]
      : getPeriodRange(period);
  const isTxRangeInvalid = Boolean(rangeStart && rangeEnd && rangeStart > rangeEnd);
  const periodTransactions = transactions
    .filter((t) => (!rangeStart || t.date >= rangeStart) && (!rangeEnd || t.date <= rangeEnd))
    .sort(sortByRecent);

  const periodIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpenses = periodTransactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodBalance = periodIncome - periodExpenses;

  const reportTransactions = transactions.filter((t) => t.date >= startDate && t.date <= endDate);

  const reportIncome = reportTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const reportExpenses = reportTransactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .reduce((sum, t) => sum + t.amount, 0);

  const reportBalance = reportIncome - reportExpenses;
  const reportTotal = reportIncome + reportExpenses;
  const incomePercent = reportTotal > 0 ? Math.round((reportIncome / reportTotal) * 100) : 0;
  const expensePercent = reportTotal > 0 ? Math.round((reportExpenses / reportTotal) * 100) : 0;

  const incomeBreakdown = reportTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.title] = (acc[t.title] || 0) + t.amount;
      return acc;
    }, {});

  const expenseBreakdown = reportTransactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .reduce((acc, t) => {
      acc[t.title] = (acc[t.title] || 0) + t.amount;
      return acc;
    }, {});

  // --- Pengeluaran per kategori (radar) ---
  const expenseCategoryTotals = {};
  reportTransactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .forEach((t) => {
      let name = getCategoryName(t);
      if (!RADAR_AXES.some((c) => c.name === name)) name = 'Lainnya';
      expenseCategoryTotals[name] = (expenseCategoryTotals[name] || 0) + t.amount;
    });

  const radarItems = RADAR_AXES.map((c) => {
    const value = expenseCategoryTotals[c.name] || 0;
    return {
      name: c.name,
      icon: c.icon,
      value,
      percent: reportExpenses > 0 ? Math.round((value / reportExpenses) * 100) : 0
    };
  });

  const categoryRows = radarItems.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

  // --- Perbandingan dengan periode sebelumnya (panjang hari sama) ---
  const parseDate = (value) => new Date(`${value}T00:00:00`);
  const rangeValid = Boolean(startDate && endDate && startDate <= endDate);
  const rangeDays = rangeValid
    ? Math.round((parseDate(endDate) - parseDate(startDate)) / 86400000) + 1
    : 0;

  let prevExpenses = 0;
  if (rangeValid) {
    const prevEnd = parseDate(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (rangeDays - 1));
    const prevStartStr = toDateStr(prevStart);
    const prevEndStr = toDateStr(prevEnd);

    prevExpenses = transactions
      .filter(
        (t) =>
          (t.type === 'expense' || t.type === 'loanPayment') &&
          t.date >= prevStartStr &&
          t.date <= prevEndStr
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }

  const expenseChange =
    prevExpenses > 0 ? Math.round(((reportExpenses - prevExpenses) / prevExpenses) * 100) : null;

  // --- Expense dynamics: harian (<= 62 hari) atau bulanan ---
  const dynamicsByMonth = rangeDays > 62;
  const dynamicsMap = {};
  reportTransactions
    .filter((t) => t.type === 'expense' || t.type === 'loanPayment')
    .forEach((t) => {
      const key = dynamicsByMonth ? t.date.slice(0, 7) : t.date;
      dynamicsMap[key] = (dynamicsMap[key] || 0) + t.amount;
    });

  const dynamics = [];
  if (rangeValid) {
    const cursor = parseDate(startDate);
    if (!dynamicsByMonth) {
      for (let i = 0; i < rangeDays; i++) {
        const key = toDateStr(cursor);
        dynamics.push({ key, value: dynamicsMap[key] || 0 });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      cursor.setDate(1);
      const end = parseDate(endDate);
      while (cursor <= end) {
        const key = toDateStr(cursor).slice(0, 7);
        dynamics.push({ key, value: dynamicsMap[key] || 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
  }

  const dynamicsMax = Math.max(0, ...dynamics.map((d) => d.value));

  const dynamicsLabel = (key) =>
    key.length === 7
      ? new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
      : formatDateLabel(key);

  // --- Home: pengeluaran bulan berjalan ---
  const homeNow = new Date();
  const homeYear = homeNow.getFullYear();
  const homeMonth = homeNow.getMonth();
  const homeMonthStart = toDateStr(new Date(homeYear, homeMonth, 1));
  const homeMonthEnd = toDateStr(new Date(homeYear, homeMonth + 1, 0));
  const homeToday = toDateStr(homeNow);
  const isSpending = (t) => t.type === 'expense' || t.type === 'loanPayment';

  const homeMonthLabel = homeNow.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const homeSpent = transactions
    .filter((t) => isSpending(t) && t.date >= homeMonthStart && t.date <= homeMonthEnd)
    .reduce((sum, t) => sum + t.amount, 0);

  // Pembanding adil: bulan lalu sampai tanggal yang sama dengan hari ini
  const prevMonthStart = toDateStr(new Date(homeYear, homeMonth - 1, 1));
  const prevMonthDays = new Date(homeYear, homeMonth, 0).getDate();
  const prevCutoff = toDateStr(new Date(homeYear, homeMonth - 1, Math.min(homeNow.getDate(), prevMonthDays)));

  const homeSpentToDate = transactions
    .filter((t) => isSpending(t) && t.date >= homeMonthStart && t.date <= homeToday)
    .reduce((sum, t) => sum + t.amount, 0);

  const homePrevSpent = transactions
    .filter((t) => isSpending(t) && t.date >= prevMonthStart && t.date <= prevCutoff)
    .reduce((sum, t) => sum + t.amount, 0);

  const homeChange =
    homePrevSpent > 0 ? Math.round(((homeSpentToDate - homePrevSpent) / homePrevSpent) * 100) : null;

  const homeDaily = [];
  for (let day = 1; day <= homeNow.getDate(); day++) {
    const key = toDateStr(new Date(homeYear, homeMonth, day));
    homeDaily.push(
      transactions
        .filter((t) => isSpending(t) && t.date === key)
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }

  const recentTransactions = [...transactions].sort(sortByRecent).slice(0, 5);

  const searchTerm = searchQuery.trim().toLowerCase();
  const searchResults = searchTerm
    ? transactions
        .filter((t) =>
          [t.title, getCategoryName(t), t.wallet, typeLabel(t.type), t.date, String(t.amount)]
            .join(' ')
            .toLowerCase()
            .includes(searchTerm)
        )
        .sort(sortByRecent)
    : [];

  const totalLoanRemaining = loans.reduce((sum, loan) => sum + loan.remaining, 0);

  const getWalletBalance = (walletName) => {
    return transactions.reduce((sum, t) => {
      if (t.wallet !== walletName) return sum;
      if (t.type === 'income') return sum + t.amount;
      if (t.type === 'expense' || t.type === 'loanPayment') return sum - t.amount;
      return sum;
    }, 0);
  };

  const renderTransactionRow = (t) => (
    <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTransaction(t)}
                    className="glass w-full text-left rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
                  >
                    <div
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${typeIconStyle(t.type)}`}
                    >
                      <Icon name={getTxIcon(t)} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.title}</p>
                      <p className="text-xs text-white/50">
                        {[getCategoryName(t), t.wallet, formatDateLabel(t.date)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className={`font-semibold text-sm whitespace-nowrap ${typeColor(t.type)}`}>
                      {signed(t)}
                      {formatNumber(t.amount)}
                    </div>
                  </button>
  );

  const handleLogin = (e) => {
    e.preventDefault();

    if (passwordInput === APP_PASSWORD) {
      setIsLoggedIn(true);
      setPasswordError('');
      showToast('Welcome', 'welcome', 'Selamat datang kembali');
    } else {
      setPasswordError('Password salah');
    }
  };

  const resetTransactionForm = () => {
    setEditingTransactionId(null);
    setForm({
      title: '',
      amount: '',
      type: 'expense',
      wallet: accounts[0] || '',
      loanId: loans[0]?.id || '',
      category: 'Lainnya',
      date: today()
    });
  };

  const openTransactionModal = (type) => {
    setEditingTransactionId(null);
    setForm({
      title: '',
      amount: '',
      type,
      wallet: accounts[0] || '',
      loanId: loans[0]?.id || '',
      category: 'Lainnya',
      date: today()
    });
    setTransactionModalOpen(true);
    setIsFabMenuOpen(false);
  };

  const openEditTransaction = (transaction) => {
    setSelectedTransaction(null);
    setEditingTransactionId(transaction.id);
    setForm({
      title: transaction.title,
      amount: String(transaction.amount),
      type: transaction.type,
      wallet: transaction.wallet,
      loanId: transaction.loanId || '',
      category: transaction.category || 'Lainnya',
      date: transaction.date
    });
    setTransactionModalOpen(true);
  };

  const restoreLoanFromOldTransaction = (oldTransaction, loanList) => {
    if (!oldTransaction || oldTransaction.type !== 'loanPayment') return loanList;

    return loanList.map((loan) =>
      loan.id === oldTransaction.loanId
        ? { ...loan, remaining: loan.remaining + oldTransaction.amount }
        : loan
    );
  };

  const applyLoanPayment = (newTransaction, loanList) => {
    if (newTransaction.type !== 'loanPayment') return loanList;

    const selectedLoan = loanList.find((loan) => String(loan.id) === String(newTransaction.loanId));

    if (!selectedLoan) {
      showToast('Pilih pinjaman terlebih dahulu', 'error');
      return null;
    }

    if (newTransaction.amount > selectedLoan.remaining) {
      showToast('Nominal pembayaran melebihi sisa pinjaman', 'error');
      return null;
    }

    return loanList.map((loan) =>
      loan.id === selectedLoan.id
        ? { ...loan, remaining: loan.remaining - newTransaction.amount }
        : loan
    );
  };

  const saveTransaction = (e) => {
    e.preventDefault();

    const amount = parseFloat(form.amount) || 0;
    if (amount <= 0) {
      showToast('Nominal harus lebih dari 0', 'error');
      return;
    }

    const title =
      form.title ||
      (form.type === 'income'
        ? form.category || 'Income Baru'
        : form.type === 'loanPayment'
        ? 'Pembayaran Pinjaman'
        : form.type === 'transfer'
        ? 'Transfer Baru'
        : form.category || 'Expense Baru');

    const newTransaction = {
      id: editingTransactionId || Date.now(),
      title,
      amount,
      type: form.type,
      wallet: form.wallet,
      loanId: form.type === 'loanPayment' ? form.loanId : '',
      category:
        form.type === 'income' || form.type === 'expense'
          ? form.category || 'Lainnya'
          : form.type === 'loanPayment'
          ? LOAN_CATEGORY.name
          : '',
      date: form.date
    };

    const oldTransaction = transactions.find((t) => t.id === editingTransactionId);
    const restoredLoans = restoreLoanFromOldTransaction(oldTransaction, loans);
    const updatedLoans = applyLoanPayment(newTransaction, restoredLoans);

    if (!updatedLoans) return;

    if (editingTransactionId) {
      setTransactions(transactions.map((t) => (t.id === editingTransactionId ? newTransaction : t)));
    } else {
      setTransactions([newTransaction, ...transactions]);
    }

    setLoans(updatedLoans);
    showToast(editingTransactionId ? 'Transaksi diperbarui' : 'Transaksi terinput', 'success');
    setTransactionModalOpen(false);
    resetTransactionForm();
  };

  const deleteTransaction = (transaction) => {
    if (transaction.type === 'loanPayment') {
      setLoans(
        loans.map((loan) =>
          loan.id === transaction.loanId
            ? { ...loan, remaining: loan.remaining + transaction.amount }
            : loan
        )
      );
    }

    setTransactions(transactions.filter((t) => t.id !== transaction.id));
    setSelectedTransaction(null);
    showToast('Transaksi dihapus', 'delete');
  };

  const saveAccount = (e) => {
    e.preventDefault();

    const name = accountName.trim();
    if (!name) return;

    const duplicated = accounts.some(
      (account) =>
        account.toLowerCase() === name.toLowerCase() &&
        account.toLowerCase() !== editingAccountName.toLowerCase()
    );

    if (duplicated) {
      showToast('Rekening sudah ada', 'error');
      return;
    }

    if (editingAccountName) {
      showToast('Rekening diperbarui', 'success');
      setAccounts(accounts.map((account) => (account === editingAccountName ? name : account)));
      setTransactions(
        transactions.map((t) => (t.wallet === editingAccountName ? { ...t, wallet: name } : t))
      );
    } else {
      showToast('Rekening ditambahkan', 'success');
      setAccounts([...accounts, name]);
    }

    setAccountName('');
    setEditingAccountName('');
    setAccountModalOpen(false);
  };

  const deleteAccount = (account) => {
    if (transactions.some((t) => t.wallet === account)) {
      showToast('Rekening tidak bisa dihapus karena sudah digunakan', 'error');
      return;
    }

    setAccounts(accounts.filter((item) => item !== account));
    setSelectedAccount(null);
    showToast('Rekening dihapus', 'delete');
  };

  const saveLoan = (e) => {
    e.preventDefault();

    const amount = parseFloat(loanForm.amount) || 0;
    const name = loanForm.name.trim() || 'Pinjaman Baru';

    if (amount <= 0) return;

    if (editingLoanId) {
      const oldLoan = loans.find((loan) => loan.id === editingLoanId);
      const paid = oldLoan.amount - oldLoan.remaining;

      if (amount < paid) {
        showToast('Total pinjaman tidak boleh lebih kecil dari jumlah yang sudah terbayar', 'error');
        return;
      }

      setLoans(
        loans.map((loan) =>
          loan.id === editingLoanId
            ? { ...loan, name, amount, remaining: amount - paid, date: loanForm.date }
            : loan
        )
      );
      showToast('Pinjaman diperbarui', 'success');
    } else {
      setLoans([{ id: Date.now(), name, amount, remaining: amount, date: loanForm.date }, ...loans]);
      showToast('Pinjaman ditambahkan', 'success');
    }

    setEditingLoanId(null);
    setLoanModalOpen(false);
  };

  const deleteLoan = (loan) => {
    if (transactions.some((t) => t.loanId === loan.id)) {
      showToast('Pinjaman tidak bisa dihapus karena sudah memiliki pembayaran', 'error');
      return;
    }

    setLoans(loans.filter((item) => item.id !== loan.id));
    setSelectedLoan(null);
    showToast('Pinjaman dihapus', 'delete');
  };

  const downloadReportExcel = () => {
    const rows = reportTransactions
      .map(
        (t) => `
          <tr>
            <td>${t.date}</td>
            <td>${t.title}</td>
            <td>${typeLabel(t.type)}</td>
            <td>${t.wallet}</td>
            <td>${t.amount}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <h2>Report</h2>
          <p>${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}</p>
          <table border="1">
            <tr><th>Total Income</th><td>${reportIncome}</td></tr>
            <tr><th>Total Expenses</th><td>${reportExpenses}</td></tr>
            <tr><th>Balance</th><td>${reportBalance}</td></tr>
          </table>
          <br />
          <table border="1">
            <tr>
              <th>Date</th>
              <th>Keterangan</th>
              <th>Type</th>
              <th>Rekening</th>
              <th>Amount</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${startDate}-to-${endDate}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Report berhasil diunduh', 'success');
  };

  const downloadBackup = () => {
    const backupData = {
      accounts,
      transactions,
      loans,
      showDecimals,
      userName,
      backupDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-keuangan-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Back Up Success', 'success', 'File backup berhasil diunduh');
  };

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (
          !Array.isArray(data.accounts) ||
          !Array.isArray(data.transactions) ||
          !Array.isArray(data.loans)
        ) {
          showToast('File backup tidak valid', 'error');
          return;
        }

        setAccounts(data.accounts);
        setTransactions(data.transactions);
        setLoans(data.loans);
        setShowDecimals(Boolean(data.showDecimals));
        setUserName(typeof data.userName === 'string' ? data.userName : '');
        setActiveDetailCategory(null);
        setIsFabMenuOpen(false);

        showToast('Import Back Up Success', 'success', 'Data berhasil dipulihkan');
      } catch {
        showToast('Gagal membaca file backup', 'error');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const clearData = () => {
    setTransactions([]);
    setLoans([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setActiveDetailCategory(null);
    setIsClearDataModalOpen(false);
    showToast('Data berhasil dihapus', 'delete');
  };

if (isCloudLoading) {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center max-w-md mx-auto shadow-2xl px-6">
      <div className="glass w-full rounded-3xl p-6 text-center">
        <p className="font-semibold text-white/90">Mengambil data cloud...</p>
        <p className="text-xs text-white/50 mt-2">{cloudStatus}</p>
      </div>
    </div>
  );
}
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center max-w-md mx-auto shadow-2xl px-6">
        <div className="glass w-full rounded-3xl p-6">
          <h1 className="font-serif text-2xl text-white text-center mb-1">Masuk</h1>
          <p className="text-sm text-white/50 text-center mb-6">
            Masukkan password untuk membuka aplikasi
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs mb-1">Password</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Masukkan password"
                className="field"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
              />

              {passwordError && <p className="text-rose-300 text-xs mt-2">{passwordError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-peach text-pine-900 rounded-xl font-semibold active:scale-95 transition-transform"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen app-bg flex flex-col justify-between max-w-md mx-auto shadow-2xl relative pb-20 select-none overflow-hidden"
      style={{ height: 'var(--app-height, 100vh)' }}
    >
      {toast && <Toast key={toast.id} {...toast} />}
      <header className="px-4 pt-5 pb-3 flex justify-between items-center gap-3">
        {activeTab === 'home' ? (
          <>
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                <Icon name="search" className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi"
                className="field pl-10 pr-9 rounded-full text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
                >
                  <Icon name="close" className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsFabMenuOpen(false);
              }}
              className="w-9 h-9 shrink-0 rounded-full glass flex items-center justify-center text-peach active:scale-95 transition-transform"
            >
              <Icon name="settings" className="w-4 h-4" />
            </button>
          </>
        ) : activeTab === 'report' ? (
          <>
            <span className="w-9"></span>
            <span className="font-serif text-xl">Report</span>
            <button
              type="button"
              onClick={downloadReportExcel}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-peach active:scale-95 transition-transform"
            >
              <Icon name="download" className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className="w-9"></span>
            <span className="font-serif text-xl capitalize">{activeTab}</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsFabMenuOpen(false);
              }}
              className="w-9 h-9 rounded-full glass flex items-center justify-center text-peach active:scale-95 transition-transform"
            >
              <Icon name="settings" className="w-4 h-4" />
            </button>
          </>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'home' && (
          <div className="p-4 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-full bg-peach/20 border border-peach/40 text-peach flex items-center justify-center font-serif text-lg">
                {userName.trim() ? userName.trim()[0].toUpperCase() : <Icon name="user" className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-serif text-2xl leading-tight truncate">
                  <span className="text-white/50">Hello</span> {userName.trim()}
                </p>
                {!userName.trim() && (
                  <button type="button" onClick={() => setActiveTab('settings')} className="text-[11px] text-peach">
                    Atur nama Anda
                  </button>
                )}
              </div>
            </div>

            {searchTerm ? (
              <div>
                <SectionTitle title="Hasil pencarian" subtitle={`${searchResults.length} transaksi ditemukan`} />
                {searchResults.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-3 text-white/30 text-sm">
                    <Icon name="search" className="w-10 h-10" />
                    Tidak ditemukan
                  </div>
                ) : (
                  <div className="space-y-3">{searchResults.map(renderTransactionRow)}</div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <SectionTitle
                    title="Wallet"
                    subtitle={`Total saldo ${formatNumber(totalBalance)}`}
                    actionLabel="Lihat semua"
                    onAction={() => setActiveTab('wallet')}
                  />
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {accounts.map((account, index) => (
                      <button
                        key={account}
                        type="button"
                        onClick={() => setSelectedAccount(account)}
                        className={`glass snap-start shrink-0 w-44 rounded-2xl p-4 text-left bg-gradient-to-br ${
                          WALLET_TINTS[index % WALLET_TINTS.length]
                        } to-white/5`}
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-peach">
                          <Icon name="wallet" className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-white/60 mt-4 truncate">{account}</p>
                        <p className="font-serif text-xl mt-0.5 truncate">{formatNumber(getWalletBalance(account))}</p>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingAccountName('');
                        setAccountName('');
                        setAccountModalOpen(true);
                      }}
                      className="snap-start shrink-0 w-24 rounded-2xl border border-dashed border-white/25 text-white/50 flex flex-col items-center justify-center gap-1 text-xs"
                    >
                      <Icon name="plus" className="w-5 h-5" />
                      Rekening
                    </button>
                  </div>
                </div>

                <div className="glass rounded-3xl p-5">
                  <p className="text-xs text-white/60">Pengeluaran {homeMonthLabel}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="font-serif text-3xl">{formatNumber(homeSpent)}</p>
                    {homeChange !== null && (
                      <span
                        className={`mb-1 text-[11px] px-2 py-0.5 rounded-full ${
                          homeChange <= 0
                            ? 'bg-emerald-400/15 text-emerald-300'
                            : 'bg-rose-400/15 text-rose-300'
                        }`}
                      >
                        {homeChange <= 0 ? '↓' : '↑'} {Math.abs(homeChange)}%
                      </span>
                    )}
                  </div>

                  {homeSpent > 0 ? (
                    <div className="mt-3">
                      <AreaSpark values={homeDaily} id="homeFill" className="w-full h-16" />
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 mt-3">Belum ada pengeluaran bulan ini</p>
                  )}

                  <p className="text-[11px] text-white/50 mt-2">
                    {homeChange !== null
                      ? `dibanding bulan lalu di tanggal yang sama (${formatNumber(homePrevSpent)})`
                      : 'Belum ada data bulan lalu untuk dibandingkan'}
                  </p>
                </div>

                <div>
                  <SectionTitle title="Tambah cepat" />
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ['Income', 'arrowDown', 'income'],
                      ['Expense', 'arrowUp', 'expense'],
                      ['Transfer', 'transfer', 'transfer'],
                      ['Pinjaman', 'loan', 'loanPayment']
                    ].map(([label, icon, type]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => openTransactionModal(type)}
                        className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
                      >
                        <span className="w-12 h-12 rounded-full glass flex items-center justify-center text-peach">
                          <Icon name={icon} className="w-5 h-5" />
                        </span>
                        <span className="text-[11px] text-white/70">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {loans.length > 0 && (
                  <div>
                    <SectionTitle
                      title="Pinjaman"
                      subtitle={`Sisa ${formatNumber(totalLoanRemaining)}`}
                      actionLabel="Lihat semua"
                      onAction={() => setActiveTab('loan')}
                    />
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {loans.map((loan) => {
                        const percent =
                          loan.amount > 0 ? Math.round(((loan.amount - loan.remaining) / loan.amount) * 100) : 0;

                        return (
                          <button
                            key={loan.id}
                            type="button"
                            onClick={() => setSelectedLoan(loan)}
                            className="glass snap-start shrink-0 w-64 rounded-2xl p-4 flex items-center gap-3 text-left"
                          >
                            <div className="relative w-12 h-12 shrink-0">
                              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="none"
                                  stroke="#f2a97e"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${percent} ${100 - percent}`}
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                                {percent}%
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{loan.name}</p>
                              <p className="text-[11px] text-white/60">Sisa {formatNumber(loan.remaining)}</p>
                              <p className="text-[11px] text-white/40">dari {formatNumber(loan.amount)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <SectionTitle
                    title="Transaksi terbaru"
                    actionLabel="Lihat semua"
                    onAction={() => setActiveTab('transactions')}
                  />
                  {recentTransactions.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center gap-3 text-white/30 text-sm">
                      <Icon name="inbox" className="w-8 h-8" />
                      Belum ada transaksi
                    </div>
                  ) : (
                    <div className="space-y-3">{recentTransactions.map(renderTransactionRow)}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-white/60 text-xs mb-1">Periode</label>
              <select
                value={period}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === 'custom') {
                    // isi awal custom dengan rentang periode yang sedang aktif
                    setTxStartDate(rangeStart || '');
                    setTxEndDate(rangeEnd || '');
                  }
                  setPeriod(next);
                }}
                className="field text-sm"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {period === 'custom' ? (
                <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                  <div>
                    <label className="block text-white/60 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={txStartDate}
                      onChange={(e) => setTxStartDate(e.target.value)}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 mb-1">End Date</label>
                    <input
                      type="date"
                      value={txEndDate}
                      onChange={(e) => setTxEndDate(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              ) : (
                rangeStart && (
                  <p className="text-[11px] text-white/50 mt-1.5">
                    {formatDateLabel(rangeStart)} - {formatDateLabel(rangeEnd)}
                  </p>
                )
              )}

              {isTxRangeInvalid && (
                <p className="text-[11px] text-rose-300 mt-1.5">
                  Start Date tidak boleh lebih besar dari End Date
                </p>
              )}
            </div>

            <div className="glass rounded-3xl p-5 mb-5">
              <p className="text-xs text-white/60 text-center">Balance</p>
              <p className="font-serif text-3xl text-center mt-1">{formatNumber(periodBalance)}</p>

              <div className="flex text-center mt-4 pt-4 border-t border-white/10">
                <div className="flex-1">
                  <p className="text-xs text-white/60">Income</p>
                  <p className="font-semibold text-emerald-300">{formatNumber(periodIncome)}</p>
                </div>
                <div className="border-r border-white/10"></div>
                <div className="flex-1">
                  <p className="text-xs text-white/60">Expenses</p>
                  <p className="font-semibold text-rose-300">{formatNumber(periodExpenses)}</p>
                </div>
              </div>
            </div>

            {periodTransactions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-white/30 text-sm">
                <Icon name="inbox" className="w-10 h-10" />
                Tidak ada data
              </div>
            ) : (
              <div className="space-y-3">
                {periodTransactions.map(renderTransactionRow)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="p-4 space-y-3">
            <div className="glass p-4 rounded-2xl flex justify-between text-sm">
              <span className="font-semibold text-white/90">Total Balance</span>
              <span className="font-bold text-white">{formatNumber(totalBalance)}</span>
            </div>

            <div className="glass rounded-2xl divide-y divide-white/10 text-sm">
              {accounts.map((account) => (
                <button
                  key={account}
                  type="button"
                  onClick={() => setSelectedAccount(account)}
                  className="w-full p-4 flex justify-between text-left"
                >
                  <span className="text-white/90">{account}</span>
                  <span className="font-semibold text-white">
                    {formatNumber(getWalletBalance(account))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <div className="border-b border-white/10 text-xs font-semibold">
              <button className="w-full py-3 text-center border-b-2 border-peach text-peach">
                Chart
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="glass rounded-2xl p-4">
                <p className="text-center text-xs font-semibold text-white/60 mb-3">
                  {formatDateLabel(startDate)} - {formatDateLabel(endDate)}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-white/60 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="field"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="field"
                    />
                  </div>
                </div>
              </div>

              <div className="glass rounded-3xl p-5">
                <p className="text-xs text-white/60">Total pengeluaran</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="font-serif text-3xl">{formatNumber(reportExpenses)}</p>
                  {expenseChange !== null && (
                    <span
                      className={`mb-1 text-[11px] px-2 py-0.5 rounded-full ${
                        expenseChange <= 0
                          ? 'bg-emerald-400/15 text-emerald-300'
                          : 'bg-rose-400/15 text-rose-300'
                      }`}
                    >
                      {expenseChange <= 0 ? '↓' : '↑'} {Math.abs(expenseChange)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 mt-1">
                  {expenseChange !== null
                    ? `dibanding periode sebelumnya (${formatNumber(prevExpenses)})`
                    : 'Belum ada data periode sebelumnya untuk dibandingkan'}
                </p>
              </div>

              <div className="p-4 glass rounded-2xl flex justify-between items-center text-sm">
                <span className="font-semibold text-white/90">Show Graphs</span>
                <button
                  onClick={() => setShowGraph(!showGraph)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ${
                    showGraph ? 'bg-peach' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                      showGraph ? 'translate-x-5' : ''
                    }`}
                  ></div>
                </button>
              </div>

              {showGraph && (
                <div className="flex justify-center items-center my-6">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
                      <circle
                        onClick={() => setActiveDetailCategory('income')}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="4.5"
                        strokeDasharray={`${incomePercent} ${100 - incomePercent}`}
                        strokeDashoffset="0"
                      />
                      <circle
                        onClick={() => setActiveDetailCategory('expense')}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#fb7185"
                        strokeWidth="4.5"
                        strokeDasharray={`${expensePercent} ${100 - expensePercent}`}
                        strokeDashoffset={`-${incomePercent}`}
                      />
                    </svg>
                    <div className="absolute inset-5 bg-pine-800 rounded-full flex flex-col justify-center items-center">
                      <p className="text-[10px] text-white/50 font-medium">Selisih</p>
                      <p className="text-xs font-bold text-white/90">{formatNumber(reportBalance)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass p-2 rounded-2xl space-y-2 text-sm text-white/90">
                <div
                  onClick={() =>
                    setActiveDetailCategory(activeDetailCategory === 'income' ? null : 'income')
                  }
                  className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-white/5 border-b border-white/5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded min-w-[38px] text-center">
                      {incomePercent}%
                    </div>
                    <span>Income</span>
                  </div>
                  <span className="font-bold text-white">{formatNumber(reportIncome)}</span>
                </div>

                <div
                  onClick={() =>
                    setActiveDetailCategory(activeDetailCategory === 'expense' ? null : 'expense')
                  }
                  className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-white/5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded min-w-[38px] text-center">
                      {expensePercent}%
                    </div>
                    <span>Expenses</span>
                  </div>
                  <span className="font-bold text-white">{formatNumber(reportExpenses)}</span>
                </div>
              </div>

              {activeDetailCategory === 'income' && (
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-emerald-300 mb-3">Detail Income</h3>
                  {Object.entries(incomeBreakdown).length === 0 ? (
                    <p className="text-sm text-white/50">Tidak ada data income</p>
                  ) : (
                    Object.entries(incomeBreakdown).map(([title, amount]) => (
                      <div key={title} className="flex justify-between py-2 border-b border-white/10">
                        <span>{title}</span>
                        <span className="font-semibold">{formatNumber(amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDetailCategory === 'expense' && (
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-rose-300 mb-3">Detail Expense</h3>
                  {Object.entries(expenseBreakdown).length === 0 ? (
                    <p className="text-sm text-white/50">Tidak ada data expense</p>
                  ) : (
                    Object.entries(expenseBreakdown).map(([title, amount]) => (
                      <div key={title} className="flex justify-between py-2 border-b border-white/10">
                        <span>{title}</span>
                        <span className="font-semibold">{formatNumber(amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {showGraph && (
                <div className="glass rounded-3xl p-4">
                  <h3 className="font-serif text-lg mb-1">Pengeluaran per kategori</h3>
                  {reportExpenses === 0 ? (
                    <p className="text-sm text-white/40 py-10 text-center">
                      Tidak ada pengeluaran pada periode ini
                    </p>
                  ) : (
                    <RadarChart items={radarItems} />
                  )}
                </div>
              )}

              {categoryRows.length > 0 && (
                <div className="glass rounded-2xl p-4 space-y-4">
                  {categoryRows.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-white/10 text-peach flex items-center justify-center">
                        <Icon name={item.icon} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">{item.name}</span>
                          <span className="font-semibold">{formatNumber(item.value)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-peach rounded-full" style={{ width: `${item.percent}%` }}></div>
                          </div>
                          <span className="text-[11px] text-white/50 w-8 text-right">{item.percent}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showGraph && (
                <div className="glass rounded-3xl p-4">
                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="font-serif text-lg">Expense dynamics</h3>
                    {dynamicsMax > 0 && (
                      <span className="text-[11px] text-white/50">Puncak {formatNumber(dynamicsMax)}</span>
                    )}
                  </div>

                  {dynamicsMax === 0 ? (
                    <p className="text-sm text-white/40 py-6 text-center">
                      Tidak ada pengeluaran pada periode ini
                    </p>
                  ) : (
                    <>
                      <AreaSpark values={dynamics.map((d) => d.value)} id="dynFill" />
                      <div className="flex justify-between text-[10px] text-white/50 mt-1">
                        <span>{dynamicsLabel(dynamics[0].key)}</span>
                        <span>{dynamicsLabel(dynamics[dynamics.length - 1].key)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'loan' && (
          <div className="p-4 space-y-3">
            <div className="glass p-4 rounded-2xl flex justify-between text-sm">
              <span className="font-semibold text-white/90">Total Sisa Pinjaman</span>
              <span className="font-bold text-rose-300">{formatNumber(totalLoanRemaining)}</span>
            </div>

            {loans.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-white/30 text-sm">
                Tidak ada data pinjaman.
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    onClick={() => setSelectedLoan(loan)}
                    className="glass w-full text-left rounded-2xl p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white text-sm">{loan.name}</p>
                        <p className="text-xs text-white/50">{loan.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/50">Sisa</p>
                        <p className="font-bold text-rose-300">{formatNumber(loan.remaining)}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-peach"
                        style={{
                          width: `${
                            loan.amount > 0
                              ? ((loan.amount - loan.remaining) / loan.amount) * 100
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-white/50 mt-2">
                      <span>Total {formatNumber(loan.amount)}</span>
                      <span>Terbayar {formatNumber(loan.amount - loan.remaining)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4 text-sm">
            <div className="glass rounded-2xl p-4">
              <label className="block text-white/60 text-xs mb-1">Nama</label>
              <input
                type="text"
                maxLength={24}
                placeholder="Nama Anda"
                className="field"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            <div className="glass rounded-2xl divide-y divide-white/10">
              <div className="flex justify-between items-center p-4">
                <span>Status Cloud</span>
                <span className="text-xs text-white/50">{cloudStatus}</span>
              </div>

              <label className="flex justify-between items-center p-4 cursor-pointer">
                <span>Show Decimals</span>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#f2a97e]"
                  checked={showDecimals}
                  onChange={(e) => setShowDecimals(e.target.checked)}
                />
              </label>
            </div>

            <div className="glass rounded-2xl divide-y divide-white/10">
              <button
                type="button"
                onClick={downloadBackup}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <span>Back Up</span>
                <Icon name="download" className="w-4 h-4 text-peach" />
              </button>

              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <span>Import Back Up</span>
                <Icon name="upload" className="w-4 h-4 text-peach" />
              </button>
            </div>

            <input
              ref={backupInputRef}
              type="file"
              accept="application/json"
              onChange={importBackup}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setIsClearDataModalOpen(true)}
              className="glass w-full rounded-2xl flex justify-between items-center p-4 text-left text-rose-300"
            >
              <span>Clear Data</span>
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {activeTab !== 'report' && activeTab !== 'home' && (
        <>
          {isFabMenuOpen && (
            <button
              type="button"
              onClick={() => setIsFabMenuOpen(false)}
              className="absolute inset-0 bg-pine-950/80 backdrop-blur-sm z-30"
            />
          )}

          <div className="absolute bottom-20 right-6 z-40 flex flex-col items-end gap-3">
            {activeTab === 'wallet' ? (
              <FabItem
                open={isFabMenuOpen}
                label="Tambah Rekening"
                color="bg-teal-500"
                icon="+"
                onClick={() => {
                  setEditingAccountName('');
                  setAccountName('');
                  setAccountModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
              />
            ) : activeTab === 'loan' ? (
              <FabItem
                open={isFabMenuOpen}
                label="Tambah Pinjaman"
                color="bg-rose-500"
                icon="+"
                onClick={() => {
                  setEditingLoanId(null);
                  setLoanForm({ name: '', amount: '', date: today() });
                  setLoanModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
              />
            ) : (
              [
                ['Transfer', 'bg-white/25', 'transfer', 'transfer'],
                ['Income', 'bg-emerald-500', 'arrowDown', 'income'],
                ['Expense', 'bg-rose-500', 'arrowUp', 'expense'],
                ['Pinjaman', 'bg-violet-500', 'loan', 'loanPayment']
              ].map(([label, color, icon, type], index) => (
                <FabItem
                  key={label}
                  open={isFabMenuOpen}
                  label={label}
                  color={color}
                  icon={icon}
                  delay={index * 45}
                  onClick={() => openTransactionModal(type)}
                />
              ))
            )}

            <button
              type="button"
              onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
              className={`w-14 h-14 bg-peach text-pine-900 rounded-full flex items-center justify-center text-3xl font-light shadow-lg active:scale-95 transition-transform duration-300 ${
                isFabMenuOpen ? 'rotate-45' : 'rotate-0'
              }`}
            >
              +
            </button>
          </div>
        </>
      )}

      {transactionModalOpen && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">
            {editingTransactionId ? 'Edit' : 'Tambah'} {typeLabel(form.type)}
          </h3>

          <form onSubmit={saveTransaction} className="space-y-3 text-xs">
            {form.type === 'loanPayment' && (
              <div>
                <label className="block text-white/60 mb-1">Pilih Pinjaman</label>
                <select
                  required
                  className="field"
                  value={form.loanId}
                  onChange={(e) => setForm({ ...form, loanId: e.target.value })}
                >
                  <option value="">Pilih pinjaman</option>
                  {loans
                    .filter((loan) => loan.remaining > 0 || String(loan.id) === String(form.loanId))
                    .map((loan) => (
                      <option key={loan.id} value={loan.id}>
                        {loan.name} - Sisa {formatNumber(loan.remaining)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {(form.type === 'income' || form.type === 'expense') && (
              <div>
                <label className="block text-white/60 mb-1">Kategori</label>
                <div className="grid grid-cols-4 gap-2">
                  {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setForm({ ...form, category: c.name })}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] transition-colors ${
                        form.category === c.name
                          ? 'bg-peach/20 border-peach text-peach'
                          : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      <Icon name={c.icon} className="w-5 h-5" />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/60 mb-1">Keterangan</label>
              <input
                type="text"
                placeholder="Contoh: Gaji, Makan Siang, Cicilan"
                className="field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                placeholder="0"
                className="field"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1">
                {form.type === 'loanPayment' ? 'Rekening Pembayaran' : 'Rekening'}
              </label>
              <select
                required
                className="field"
                value={form.wallet}
                onChange={(e) => setForm({ ...form, wallet: e.target.value })}
              >
                {accounts.map((account) => (
                  <option key={account} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 mb-1">Tanggal</label>
              <input
                type="date"
                required
                className="field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTransactionModalOpen(false);
                  resetTransactionForm();
                }}
                className="flex-1 py-2 bg-white/10 text-white/80 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-peach text-pine-900 rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {accountModalOpen && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">
            {editingAccountName ? 'Edit Rekening' : 'Tambah Rekening'}
          </h3>

          <form onSubmit={saveAccount} className="space-y-3 text-xs">
            <div>
              <label className="block text-white/60 mb-1">Nama Rekening</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mandiri, Cash"
                className="field"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAccountModalOpen(false);
                  setEditingAccountName('');
                }}
                className="flex-1 py-2 bg-white/10 text-white/80 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-peach text-pine-900 rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {loanModalOpen && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">
            {editingLoanId ? 'Edit Pinjaman' : 'Tambah Pinjaman'}
          </h3>

          <form onSubmit={saveLoan} className="space-y-3 text-xs">
            <div>
              <label className="block text-white/60 mb-1">Nama Pinjaman</label>
              <input
                type="text"
                required
                placeholder="Contoh: Pinjaman Motor"
                className="field"
                value={loanForm.name}
                onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1">Total Pinjaman (Rp)</label>
              <input
                type="number"
                required
                placeholder="0"
                className="field"
                value={loanForm.amount}
                onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-white/60 mb-1">Tanggal</label>
              <input
                type="date"
                required
                className="field"
                value={loanForm.date}
                onChange={(e) => setLoanForm({ ...loanForm, date: e.target.value })}
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLoanModalOpen(false);
                  setEditingLoanId(null);
                }}
                className="flex-1 py-2 bg-white/10 text-white/80 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-peach text-pine-900 rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTransaction && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">Rincian Transaksi</h3>
          <Detail label="Keterangan" value={selectedTransaction.title} />
          <Detail label="Tipe" value={typeLabel(selectedTransaction.type)} />
          {getCategoryName(selectedTransaction) && (
            <Detail label="Kategori" value={getCategoryName(selectedTransaction)} />
          )}
          <Detail label="Rekening" value={selectedTransaction.wallet} />
          <Detail label="Tanggal" value={selectedTransaction.date} />
          <Detail label="Nominal" value={formatNumber(selectedTransaction.amount)} bold />

          <ActionButtons
            onClose={() => setSelectedTransaction(null)}
            onEdit={() => openEditTransaction(selectedTransaction)}
            onDelete={() => deleteTransaction(selectedTransaction)}
          />
        </Modal>
      )}

      {selectedAccount && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">Rincian Rekening</h3>
          <Detail label="Nama Rekening" value={selectedAccount} />
          <Detail label="Saldo" value={formatNumber(getWalletBalance(selectedAccount))} bold />
          <Detail
            label="Jumlah Transaksi"
            value={transactions.filter((t) => t.wallet === selectedAccount).length}
          />

          <ActionButtons
            onClose={() => setSelectedAccount(null)}
            onEdit={() => {
              setAccountName(selectedAccount);
              setEditingAccountName(selectedAccount);
              setSelectedAccount(null);
              setAccountModalOpen(true);
            }}
            onDelete={() => deleteAccount(selectedAccount)}
          />
        </Modal>
      )}

      {selectedLoan && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-4">Rincian Pinjaman</h3>
          <Detail label="Nama" value={selectedLoan.name} />
          <Detail label="Tanggal" value={selectedLoan.date} />
          <Detail label="Total" value={formatNumber(selectedLoan.amount)} />
          <Detail label="Terbayar" value={formatNumber(selectedLoan.amount - selectedLoan.remaining)} />
          <Detail label="Sisa" value={formatNumber(selectedLoan.remaining)} bold />

          <ActionButtons
            onClose={() => setSelectedLoan(null)}
            onEdit={() => {
              setLoanForm({
                name: selectedLoan.name,
                amount: String(selectedLoan.amount),
                date: selectedLoan.date
              });
              setEditingLoanId(selectedLoan.id);
              setSelectedLoan(null);
              setLoanModalOpen(true);
            }}
            onDelete={() => deleteLoan(selectedLoan)}
          />
        </Modal>
      )}

      {isClearDataModalOpen && (
        <Modal>
          <h3 className="font-serif text-lg text-white mb-2">Clear Data</h3>
          <p className="text-sm text-white/60 mb-4">Apakah anda yakin akan clear data?</p>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsClearDataModalOpen(false)}
              className="flex-1 py-2 bg-white/10 text-white/80 rounded-lg font-medium"
            >
              Tidak
            </button>
            <button
              type="button"
              onClick={clearData}
              className="flex-1 py-2 bg-rose-500/90 text-white rounded-lg font-medium"
            >
              Ya
            </button>
          </div>
        </Modal>
      )}

      <footer className="glass-nav absolute bottom-0 left-0 right-0 h-16 flex justify-around items-stretch text-[10px] text-white/50 z-30">
        {[
          ['home', 'home', 'Home'],
          ['transactions', 'list', 'Transactions'],
          ['wallet', 'wallet', 'Wallet'],
          ['report', 'chart', 'Report'],
          ['loan', 'loan', 'Loan'],
          ['settings', 'settings', 'Settings']
        ].map(([tab, icon, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setIsFabMenuOpen(false);
            }}
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 transition-colors ${
              activeTab === tab ? 'text-peach font-semibold' : ''
            }`}
          >
            {activeTab === tab && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full bg-peach shadow-[0_0_10px_#f2a97e]"></span>
            )}
            <Icon name={icon} className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
}

function FabItem({ open, label, color, icon, onClick, delay = 0 }) {
  return (
    <div
      className={`flex items-center gap-3 transition-all duration-300 ease-out ${
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      style={{ transitionDelay: open ? `${delay}ms` : '0ms' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="glass-strong text-white font-semibold px-4 py-2 rounded-xl text-sm"
      >
        {label}
      </button>

      <button
        type="button"
        onClick={onClick}
        className={`w-12 h-12 ${color} text-white rounded-full flex items-center justify-center text-xl font-semibold shadow-lg active:scale-95 transition-transform`}
      >
        {ICONS[icon] ? <Icon name={icon} className="w-5 h-5" /> : icon}
      </button>
    </div>
  );
}

function Detail({ label, value, bold = false }) {
  return (
    <div className="flex justify-between text-sm text-white/90 py-1 gap-3">
      <span>{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-semibold'} text-right`}>{value}</span>
    </div>
  );
}

function ActionButtons({ onClose, onEdit, onDelete }) {
  return (
    <div className="flex space-x-2 pt-5">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2 bg-white/10 text-white/80 rounded-lg font-medium"
      >
        Tutup
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 py-2 bg-peach text-pine-900 rounded-lg font-medium"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex-1 py-2 bg-rose-500/90 text-white rounded-lg font-medium"
      >
        Hapus
      </button>
    </div>
  );
}

function Toast({ message, subtitle, type }) {
  const isSuccess = type === 'success';
  const isWelcome = type === 'welcome';
  const isDelete = type === 'delete';

  const circleColor = isSuccess ? 'bg-emerald-400' : isWelcome ? 'bg-peach' : 'bg-rose-400';

  return (
    <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4 pointer-events-none">
      <style>{`
        @keyframes toast-in {
          0% { opacity: 0; transform: translateY(-28px) scale(0.9); }
          60% { opacity: 1; transform: translateY(4px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-out {
          to { opacity: 0; transform: translateY(-18px) scale(0.95); }
        }
        @keyframes toast-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes toast-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes toast-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(18deg); }
          75% { transform: rotate(-14deg); }
        }
      `}</style>

      <div
        className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[220px] max-w-sm"
        style={{
          animation: 'toast-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both, toast-out 0.3s ease-in 2s forwards'
        }}
      >
        <div
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${circleColor}`}
          style={{ animation: 'toast-pop 0.4s ease-out 0.1s both' }}
        >
          {isSuccess && (
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M5 12.5l4.5 4.5L19 7.5"
                strokeDasharray="24"
                strokeDashoffset="24"
                style={{ animation: 'toast-draw 0.4s ease-out 0.35s forwards' }}
              />
            </svg>
          )}

          {isWelcome && (
            <span className="text-xl leading-none" style={{ display: 'inline-block', transformOrigin: '70% 70%', animation: 'toast-wave 0.9s ease-in-out 0.4s 2' }}>
              👋
            </span>
          )}

          {isDelete && (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
          )}

          {type === 'error' && (
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M12 6v8M12 18v.5" />
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{message}</p>
          {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function Modal({ children }) {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-strong rounded-3xl w-full max-w-sm p-5 max-h-[88vh] overflow-y-auto">{children}</div>
    </div>
  );
}
