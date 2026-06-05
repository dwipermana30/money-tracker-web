import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const DEFAULT_ACCOUNTS = ['BCA', 'BRI', 'Dana', 'Gopay'];
const APP_PASSWORD = '3003';
const FIRESTORE_COLLECTION = 'financeApps';
const FIRESTORE_DOCUMENT_ID = 'main-data';

export default function App() {
  const today = () => new Date().toISOString().split('T')[0];

  const firstDay = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const lastDay = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  };

  const backupInputRef = useRef(null);
const hasLoadedCloudData = useRef(false);

const [isCloudLoading, setIsCloudLoading] = useState(true);
const [cloudStatus, setCloudStatus] = useState('Menghubungkan ke Firestore...');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [activeTab, setActiveTab] = useState('transactions');
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
    date: today()
  });
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
}, [accounts, transactions, loans, showDecimals]);
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
    if (type === 'income') return 'text-green-600';
    if (type === 'loanPayment') return 'text-purple-600';
    if (type === 'transfer') return 'text-gray-500';
    return 'text-red-500';
  };

  const sideColor = (type) => {
    if (type === 'income') return 'bg-green-500';
    if (type === 'loanPayment') return 'bg-purple-500';
    if (type === 'transfer') return 'bg-gray-400';
    return 'bg-red-500';
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

  const totalLoanRemaining = loans.reduce((sum, loan) => sum + loan.remaining, 0);

  const getWalletBalance = (walletName) => {
    return transactions.reduce((sum, t) => {
      if (t.wallet !== walletName) return sum;
      if (t.type === 'income') return sum + t.amount;
      if (t.type === 'expense' || t.type === 'loanPayment') return sum - t.amount;
      return sum;
    }, 0);
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (passwordInput === APP_PASSWORD) {
      setIsLoggedIn(true);
      setPasswordError('');
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
      alert('Pilih pinjaman terlebih dahulu');
      return null;
    }

    if (newTransaction.amount > selectedLoan.remaining) {
      alert('Nominal pembayaran melebihi sisa pinjaman');
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
      alert('Nominal harus lebih dari 0');
      return;
    }

    const title =
      form.title ||
      (form.type === 'income'
        ? 'Income Baru'
        : form.type === 'loanPayment'
        ? 'Pembayaran Pinjaman'
        : form.type === 'transfer'
        ? 'Transfer Baru'
        : 'Expense Baru');

    const newTransaction = {
      id: editingTransactionId || Date.now(),
      title,
      amount,
      type: form.type,
      wallet: form.wallet,
      loanId: form.type === 'loanPayment' ? form.loanId : '',
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
      alert('Rekening sudah ada');
      return;
    }

    if (editingAccountName) {
      setAccounts(accounts.map((account) => (account === editingAccountName ? name : account)));
      setTransactions(
        transactions.map((t) => (t.wallet === editingAccountName ? { ...t, wallet: name } : t))
      );
    } else {
      setAccounts([...accounts, name]);
    }

    setAccountName('');
    setEditingAccountName('');
    setAccountModalOpen(false);
  };

  const deleteAccount = (account) => {
    if (transactions.some((t) => t.wallet === account)) {
      alert('Rekening tidak bisa dihapus karena sudah digunakan');
      return;
    }

    setAccounts(accounts.filter((item) => item !== account));
    setSelectedAccount(null);
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
        alert('Total pinjaman tidak boleh lebih kecil dari jumlah yang sudah terbayar');
        return;
      }

      setLoans(
        loans.map((loan) =>
          loan.id === editingLoanId
            ? { ...loan, name, amount, remaining: amount - paid, date: loanForm.date }
            : loan
        )
      );
    } else {
      setLoans([{ id: Date.now(), name, amount, remaining: amount, date: loanForm.date }, ...loans]);
    }

    setEditingLoanId(null);
    setLoanModalOpen(false);
  };

  const deleteLoan = (loan) => {
    if (transactions.some((t) => t.loanId === loan.id)) {
      alert('Pinjaman tidak bisa dihapus karena sudah memiliki pembayaran');
      return;
    }

    setLoans(loans.filter((item) => item.id !== loan.id));
    setSelectedLoan(null);
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
  };

  const downloadBackup = () => {
    const backupData = {
      accounts,
      transactions,
      loans,
      showDecimals,
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
          alert('File backup tidak valid');
          return;
        }

        setAccounts(data.accounts);
        setTransactions(data.transactions);
        setLoans(data.loans);
        setShowDecimals(Boolean(data.showDecimals));
        setActiveDetailCategory(null);
        setIsFabMenuOpen(false);

        alert('Backup berhasil diimport');
      } catch {
        alert('Gagal membaca file backup');
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
  };

if (isCloudLoading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center max-w-md mx-auto shadow-xl px-6">
      <div className="bg-white w-full rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
        <p className="font-semibold text-gray-700">Mengambil data cloud...</p>
        <p className="text-xs text-gray-400 mt-2">{cloudStatus}</p>
      </div>
    </div>
  );
}
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center max-w-md mx-auto shadow-xl px-6">
        <div className="bg-white w-full rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-1">Masuk</h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Masukkan password untuk membuka aplikasi
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Password</label>
              <input
                type="password"
                required
                autoFocus
                placeholder="Masukkan password"
                className="w-full p-3 border rounded-xl focus:outline-none focus:border-[#2196f3]"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
              />

              {passwordError && <p className="text-red-500 text-xs mt-2">{passwordError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2196f3] text-white rounded-xl font-semibold active:scale-95 transition-transform"
            >
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between max-w-md mx-auto shadow-xl relative pb-20 select-none overflow-hidden">
      <header className="bg-[#2196f3] text-white p-4 text-center font-semibold text-base shadow-sm flex justify-between items-center">
        {activeTab === 'report' ? (
          <>
            <span className="w-6"></span>
            <span>Report</span>
            <button onClick={downloadReportExcel} className="text-lg">
              ↓
            </button>
          </>
        ) : (
          <>
            <span className="w-6"></span>
            <span className="capitalize">{activeTab}</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsFabMenuOpen(false);
              }}
              className="text-lg"
            >
              ⚙
            </button>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'transactions' && (
          <div className="p-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between text-center mb-4">
              <div>
                <p className="text-xs text-gray-400">Income</p>
                <p className="font-bold text-green-600">{formatNumber(totalIncome)}</p>
              </div>
              <div className="border-r border-gray-100"></div>
              <div>
                <p className="text-xs text-gray-400">Expenses</p>
                <p className="font-bold text-red-500">{formatNumber(totalExpenses)}</p>
              </div>
              <div className="border-r border-gray-100"></div>
              <div>
                <p className="text-xs text-gray-400">Balance</p>
                <p className="font-bold text-blue-600">{formatNumber(totalBalance)}</p>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-300 text-sm">
                Tidak ada data
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTransaction(t)}
                    className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center relative"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${sideColor(t.type)}`}></div>
                    <div className="pl-2">
                      <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.wallet} - {t.date}</p>
                    </div>
                    <div className={`font-bold text-sm ${typeColor(t.type)}`}>
                      {signed(t)}
                      {formatNumber(t.amount)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="p-4 space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Total Balance</span>
              <span className="font-bold text-gray-900">{formatNumber(totalBalance)}</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border divide-y text-sm">
              {accounts.map((account) => (
                <button
                  key={account}
                  type="button"
                  onClick={() => setSelectedAccount(account)}
                  className="w-full p-4 flex justify-between text-left"
                >
                  <span className="text-gray-700">{account}</span>
                  <span className="font-semibold text-gray-900">
                    {formatNumber(getWalletBalance(account))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div>
            <div className="bg-white border-b border-gray-200 text-xs font-semibold">
              <button className="w-full py-3 text-center border-b-2 border-[#2196f3] text-[#2196f3]">
                Chart
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-center text-xs font-semibold text-gray-500 mb-3">
                  {formatDateLabel(startDate)} - {formatDateLabel(endDate)}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700">Show Graphs</span>
                <button
                  onClick={() => setShowGraph(!showGraph)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ${
                    showGraph ? 'bg-[#2196f3]' : 'bg-gray-300'
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
                      <circle
                        onClick={() => setActiveDetailCategory('income')}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#4caf50"
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
                        stroke="#e53935"
                        strokeWidth="4.5"
                        strokeDasharray={`${expensePercent} ${100 - expensePercent}`}
                        strokeDashoffset={`-${incomePercent}`}
                      />
                    </svg>
                    <div className="absolute inset-5 bg-white rounded-full flex flex-col justify-center items-center">
                      <p className="text-[10px] text-gray-400 font-medium">Selisih</p>
                      <p className="text-xs font-bold text-gray-700">{formatNumber(reportBalance)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm space-y-2 text-sm text-gray-700">
                <div
                  onClick={() =>
                    setActiveDetailCategory(activeDetailCategory === 'income' ? null : 'income')
                  }
                  className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50 border-b border-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#4caf50] text-white text-[11px] font-bold px-2 py-0.5 rounded min-w-[38px] text-center">
                      {incomePercent}%
                    </div>
                    <span>Income</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatNumber(reportIncome)}</span>
                </div>

                <div
                  onClick={() =>
                    setActiveDetailCategory(activeDetailCategory === 'expense' ? null : 'expense')
                  }
                  className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#e53935] text-white text-[11px] font-bold px-2 py-0.5 rounded min-w-[38px] text-center">
                      {expensePercent}%
                    </div>
                    <span>Expenses</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatNumber(reportExpenses)}</span>
                </div>
              </div>

              {activeDetailCategory === 'income' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-green-600 mb-3">Detail Income</h3>
                  {Object.entries(incomeBreakdown).length === 0 ? (
                    <p className="text-sm text-gray-400">Tidak ada data income</p>
                  ) : (
                    Object.entries(incomeBreakdown).map(([title, amount]) => (
                      <div key={title} className="flex justify-between py-2 border-b border-gray-100">
                        <span>{title}</span>
                        <span className="font-semibold">{formatNumber(amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeDetailCategory === 'expense' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-red-500 mb-3">Detail Expense</h3>
                  {Object.entries(expenseBreakdown).length === 0 ? (
                    <p className="text-sm text-gray-400">Tidak ada data expense</p>
                  ) : (
                    Object.entries(expenseBreakdown).map(([title, amount]) => (
                      <div key={title} className="flex justify-between py-2 border-b border-gray-100">
                        <span>{title}</span>
                        <span className="font-semibold">{formatNumber(amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'loan' && (
          <div className="p-4 space-y-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Total Sisa Pinjaman</span>
              <span className="font-bold text-red-500">{formatNumber(totalLoanRemaining)}</span>
            </div>

            {loans.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-300 text-sm">
                Tidak ada data pinjaman.
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <button
                    key={loan.id}
                    type="button"
                    onClick={() => setSelectedLoan(loan)}
                    className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{loan.name}</p>
                        <p className="text-xs text-gray-400">{loan.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Sisa</p>
                        <p className="font-bold text-red-500">{formatNumber(loan.remaining)}</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2196f3]"
                        style={{
                          width: `${
                            loan.amount > 0
                              ? ((loan.amount - loan.remaining) / loan.amount) * 100
                              : 0
                          }%`
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-400 mt-2">
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
          <div className="p-4 space-y-4 text-sm text-gray-700 bg-white min-h-full">
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex justify-between items-center py-2 border-b">
  <span>Status Cloud</span>
  <span className="text-xs text-gray-400">{cloudStatus}</span>
</div>
              <span>Show Decimals</span>
              <input
                type="checkbox"
                checked={showDecimals}
                onChange={(e) => setShowDecimals(e.target.checked)}
              />
            </div>

            <button
              type="button"
              onClick={downloadBackup}
              className="w-full flex justify-between items-center py-2 border-b text-left"
            >
              <span>Back Up</span>
              <span className="text-[#2196f3]">↓</span>
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="w-full flex justify-between items-center py-2 border-b text-left"
            >
              <span>Import Back Up</span>
              <span className="text-[#2196f3]">↑</span>
            </button>

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
              className="w-full flex justify-between items-center py-2 border-b text-left"
            >
              <span>Clear Data</span>
              <span className="text-red-500">›</span>
            </button>
          </div>
        )}
      </main>

      {activeTab !== 'report' && (
        <>
          {isFabMenuOpen && (
            <button
              type="button"
              onClick={() => setIsFabMenuOpen(false)}
              className="absolute inset-0 bg-white/70 z-30"
            />
          )}

          <div className="absolute bottom-20 right-6 z-40 flex flex-col items-end gap-3">
            {activeTab === 'wallet' ? (
              <FabItem
                open={isFabMenuOpen}
                label="Tambah Rekening"
                color="bg-[#2196f3]"
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
                color="bg-[#ff5f67]"
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
                ['Transfer', 'bg-gray-400', '⇄', 'transfer'],
                ['Income', 'bg-[#ffb74d]', '$', 'income'],
                ['Expense', 'bg-[#ff5f67]', '-', 'expense'],
                ['Pinjaman', 'bg-purple-500', 'P', 'loanPayment']
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
              className={`w-14 h-14 bg-[#2196f3] text-white rounded-full flex items-center justify-center text-3xl font-light shadow-lg active:scale-95 transition-transform duration-300 ${
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
          <h3 className="font-bold text-gray-800 mb-4 text-base">
            {editingTransactionId ? 'Edit' : 'Tambah'} {typeLabel(form.type)}
          </h3>

          <form onSubmit={saveTransaction} className="space-y-3 text-xs">
            {form.type === 'loanPayment' && (
              <div>
                <label className="block text-gray-500 mb-1">Pilih Pinjaman</label>
                <select
                  required
                  className="w-full p-2 border rounded-lg bg-white"
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

            <div>
              <label className="block text-gray-500 mb-1">Keterangan</label>
              <input
                type="text"
                placeholder="Contoh: Gaji, Makan Siang, Cicilan"
                className="w-full p-2 border rounded-lg"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                required
                placeholder="0"
                className="w-full p-2 border rounded-lg"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">
                {form.type === 'loanPayment' ? 'Rekening Pembayaran' : 'Rekening'}
              </label>
              <select
                required
                className="w-full p-2 border rounded-lg bg-white"
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
              <label className="block text-gray-500 mb-1">Tanggal</label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded-lg"
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
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-[#2196f3] text-white rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {accountModalOpen && (
        <Modal>
          <h3 className="font-bold text-gray-800 mb-4 text-base">
            {editingAccountName ? 'Edit Rekening' : 'Tambah Rekening'}
          </h3>

          <form onSubmit={saveAccount} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">Nama Rekening</label>
              <input
                type="text"
                required
                placeholder="Contoh: Mandiri, Cash"
                className="w-full p-2 border rounded-lg"
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
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-[#2196f3] text-white rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {loanModalOpen && (
        <Modal>
          <h3 className="font-bold text-gray-800 mb-4 text-base">
            {editingLoanId ? 'Edit Pinjaman' : 'Tambah Pinjaman'}
          </h3>

          <form onSubmit={saveLoan} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-500 mb-1">Nama Pinjaman</label>
              <input
                type="text"
                required
                placeholder="Contoh: Pinjaman Motor"
                className="w-full p-2 border rounded-lg"
                value={loanForm.name}
                onChange={(e) => setLoanForm({ ...loanForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">Total Pinjaman (Rp)</label>
              <input
                type="number"
                required
                placeholder="0"
                className="w-full p-2 border rounded-lg"
                value={loanForm.amount}
                onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-gray-500 mb-1">Tanggal</label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded-lg"
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
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
              >
                Batal
              </button>
              <button type="submit" className="flex-1 py-2 bg-[#2196f3] text-white rounded-lg font-medium">
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedTransaction && (
        <Modal>
          <h3 className="font-bold text-gray-800 mb-4 text-base">Rincian Transaksi</h3>
          <Detail label="Keterangan" value={selectedTransaction.title} />
          <Detail label="Tipe" value={typeLabel(selectedTransaction.type)} />
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
          <h3 className="font-bold text-gray-800 mb-4 text-base">Rincian Rekening</h3>
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
          <h3 className="font-bold text-gray-800 mb-4 text-base">Rincian Pinjaman</h3>
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
          <h3 className="font-bold text-gray-800 mb-2 text-base">Clear Data</h3>
          <p className="text-sm text-gray-500 mb-4">Apakah anda yakin akan clear data?</p>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsClearDataModalOpen(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
            >
              Tidak
            </button>
            <button
              type="button"
              onClick={clearData}
              className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
            >
              Ya
            </button>
          </div>
        </Modal>
      )}

      <footer className="bg-white border-t border-gray-200 absolute bottom-0 left-0 right-0 h-16 flex justify-around items-center text-[10px] text-gray-400 z-30">
        {[
          ['transactions', '▤', 'Transactions'],
          ['wallet', '▣', 'Wallet'],
          ['report', '▥', 'Report'],
          ['loan', '□', 'Loan'],
          ['settings', '⚙', 'Settings']
        ].map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setIsFabMenuOpen(false);
            }}
            className={`flex flex-col items-center flex-1 py-1 ${
              activeTab === tab ? 'text-[#2196f3] font-semibold' : ''
            }`}
          >
            <span>{icon}</span>
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
        className="bg-white text-gray-800 font-bold px-4 py-2 rounded-lg shadow-md border border-gray-100"
      >
        {label}
      </button>

      <button
        type="button"
        onClick={onClick}
        className={`w-12 h-12 ${color} text-white rounded-full flex items-center justify-center text-xl font-semibold shadow-lg active:scale-95 transition-transform`}
      >
        {icon}
      </button>
    </div>
  );
}

function Detail({ label, value, bold = false }) {
  return (
    <div className="flex justify-between text-sm text-gray-700 py-1 gap-3">
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
        className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium"
      >
        Tutup
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 py-2 bg-[#2196f3] text-white rounded-lg font-medium"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium"
      >
        Hapus
      </button>
    </div>
  );
}

function Modal({ children }) {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">{children}</div>
    </div>
  );
}