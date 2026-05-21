import { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface InventoryItem {
  id: string;
  name: string;
  category: 'EQUIPMENT' | 'CONSUMABLE' | 'MEDICATION';
  current_stock: number;
  minimum_stock: number;
  unit_cost: number;
  unit: string;
  supplier_name: string;
  supplier_contact: string;
  notes?: string;
  last_restocked_at: string;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  item_name: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  performed_by: string;
  created_at: string;
}



const Inventory = () => {
  const { name: currentUserName } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');

  // Load from localStorage
  useEffect(() => {
    const storedItems = localStorage.getItem('rehab-swat-inventory');
    const storedTxs = localStorage.getItem('rehab-swat-inventory-txs');
    setItems(storedItems ? JSON.parse(storedItems) : []);
    setTransactions(storedTxs ? JSON.parse(storedTxs) : []);
  }, []);

  // Save changes helper
  const saveItems = (newItems: InventoryItem[]) => {
    setItems(newItems);
    localStorage.setItem('rehab-swat-inventory', JSON.stringify(newItems));
  };

  const saveTransactions = (newTxs: InventoryTransaction[]) => {
    setTransactions(newTxs);
    localStorage.setItem('rehab-swat-inventory-txs', JSON.stringify(newTxs));
  };

  // Handlers
  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: fd.get('name') as string,
      category: fd.get('category') as any,
      current_stock: Number(fd.get('current_stock')),
      minimum_stock: Number(fd.get('minimum_stock')),
      unit_cost: Number(fd.get('unit_cost')),
      unit: fd.get('unit') as string,
      supplier_name: fd.get('supplier_name') as string,
      supplier_contact: fd.get('supplier_contact') as string,
      notes: fd.get('notes') as string || undefined,
      last_restocked_at: new Date().toISOString()
    };

    const updated = [...items, newItem];
    saveItems(updated);

    // Record initial transaction
    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      item_id: newItem.id,
      item_name: newItem.name,
      transaction_type: 'IN',
      quantity: newItem.current_stock,
      reason: 'Initial stock import',
      performed_by: currentUserName || 'Unknown User',
      created_at: new Date().toISOString()
    };
    saveTransactions([newTx, ...transactions]);
    setIsAddModalOpen(false);
  };

  const handleTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItem) return;
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get('quantity'));
    const reason = fd.get('reason') as string;

    const newStock = txType === 'IN' 
      ? selectedItem.current_stock + qty 
      : Math.max(0, selectedItem.current_stock - qty);

    // Update item stock
    const updatedItems = items.map(item => 
      item.id === selectedItem.id 
        ? { 
            ...item, 
            current_stock: newStock,
            ...(txType === 'IN' ? { last_restocked_at: new Date().toISOString() } : {})
          }
        : item
    );
    saveItems(updatedItems);

    // Create transaction log
    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      transaction_type: txType,
      quantity: qty,
      reason,
      performed_by: currentUserName || 'Unknown User',
      created_at: new Date().toISOString()
    };
    saveTransactions([newTx, ...transactions]);
    setIsTxModalOpen(false);
  };

  // Computes low stock
  const lowStockItems = items.filter(item => item.current_stock < item.minimum_stock);

  return (
    <div className="animate-[fadeIn_0.5s_ease_forwards]">
      {/* Header */}
      <div className="flex justify-between items-end py-10 border-b border-teal-500/10 mb-8">
        <div>
          <h1 className="font-display text-[3rem] font-light leading-tight text-bone-100">
            Clinical <em className="italic text-teal-400">Inventory</em>
          </h1>
          <p className="text-[.82rem] text-bone-600 mt-2">
            Track equipment, therapy supplies, and clinical materials
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-6 py-3 rounded-md font-ui text-[.78rem] font-semibold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(20,184,166,0.3)] shrink-0"
        >
          + Add Inventory Item
        </button>
      </div>

      {/* Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 mb-8 flex gap-4 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-[.85rem] font-semibold text-amber-400 uppercase tracking-wider">Low Stock Alerts</h3>
            <p className="text-[.78rem] text-bone-300 mt-1">
              The following supply levels have dropped below their defined safety threshold:
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {lowStockItems.map(item => (
                <span 
                  key={item.id} 
                  className="bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full px-3 py-1 text-[.68rem] font-mono font-semibold"
                >
                  {item.name} ({item.current_stock} remaining)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Inventory Catalog Table */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-500/10 bg-teal-500/2">
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" /> Stock Catalog
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-teal-500/5 border-b border-teal-500/10 text-[.65rem] uppercase tracking-[.1em] text-teal-500 font-bold">
                  <th className="px-5 py-3.5">Item Details</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Stock Level</th>
                  <th className="px-5 py-3.5">Cost / Unit</th>
                  <th className="px-5 py-3.5">Supplier Details</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLow = item.current_stock < item.minimum_stock;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-teal-500/10 hover:bg-teal-500/5 transition-colors group text-[.8rem]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-bone-100 group-hover:text-teal-400 transition-colors">
                          {item.name}
                        </div>
                        {item.notes && <div className="text-[.68rem] text-bone-600 mt-1 max-w-sm truncate">{item.notes}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full px-2.5 py-0.5 text-[.62rem] font-bold uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${isLow ? 'text-red-400' : 'text-bone-300'}`}>
                            {item.current_stock}
                          </span>
                          <span className="text-bone-600 text-[.7rem]">/ {item.minimum_stock} {item.unit}s</span>
                          {isLow && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.2 text-[.58rem] font-bold uppercase shrink-0">
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-bone-300">
                        ₨ {item.unit_cost.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-[.75rem]">
                        <div className="text-bone-300">{item.supplier_name}</div>
                        <div className="text-bone-600 text-[.68rem] mt-0.5 font-mono">{item.supplier_contact}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setTxType('IN');
                              setIsTxModalOpen(true);
                            }}
                            className="bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/20 text-teal-400 px-2.5 py-1.5 rounded text-[.65rem] font-semibold transition-all"
                          >
                            + Restock
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setTxType('OUT');
                              setIsTxModalOpen(true);
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded text-[.65rem] font-semibold transition-all"
                          >
                            - Dispense
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-physio-card border border-teal-500/10 rounded-2xl overflow-hidden p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-[.88rem] font-semibold text-bone-100 uppercase tracking-widest flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-400 animate-pulse" /> Transactions
            </h2>
            <p className="text-[.68rem] text-bone-600 mt-1">Real-time stock dispensing & restocking audits</p>
          </div>

          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
            {transactions.map((tx) => (
              <div 
                key={tx.id} 
                className="bg-physio-navy/60 border border-teal-500/5 rounded-xl p-3.5 flex gap-3 items-start"
              >
                {tx.transaction_type === 'IN' ? (
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-teal-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <ArrowDownRight className="w-4 h-4 text-red-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[.78rem] font-semibold text-bone-100 truncate">{tx.item_name}</div>
                  <div className="text-[.68rem] text-bone-600 mt-0.5 truncate">{tx.reason}</div>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-[.62rem] text-teal-500 uppercase tracking-wider font-mono">
                      By {tx.performed_by}
                    </span>
                    <span className="text-[.62rem] text-bone-900 font-mono">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
                <div className={`font-mono text-[.82rem] font-bold ${tx.transaction_type === 'IN' ? 'text-teal-400' : 'text-red-400'}`}>
                  {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Add Inventory Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[95vh] overflow-y-auto">
            <h2 className="font-display text-[1.5rem] text-bone-100 mb-1">Add Supply Item</h2>
            <p className="text-[.78rem] text-bone-600 mb-6">Register a new clinical consumable or equipment item.</p>
            <form onSubmit={handleAddItem} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Item Name *</label>
                <input name="name" required placeholder="e.g. Theraband Yellow" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Category *</label>
                  <select name="category" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]">
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="MEDICATION">Medication</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Measure Unit *</label>
                  <input name="unit" required placeholder="e.g. Roll, Piece, Strip" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Stock *</label>
                  <input name="current_stock" type="number" required placeholder="10" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Safety Threshold *</label>
                  <input name="minimum_stock" type="number" required placeholder="5" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Unit Cost (₨) *</label>
                  <input name="unit_cost" type="number" required placeholder="1200" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem] font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Supplier Name</label>
                  <input name="supplier_name" placeholder="Supplier Pvt Ltd" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Supplier Phone</label>
                  <input name="supplier_contact" placeholder="+92 300 1234567" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Notes / Descriptions</label>
                <textarea name="notes" rows={2} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all resize-none text-[.82rem]" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-physio-deep px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispense / Restock Item */}
      {isTxModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-physio-deep/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-physio-card border border-teal-500/25 rounded-3xl p-8 w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-[1.4rem] text-bone-100 mb-1">
              {txType === 'IN' ? 'Restock Stock' : 'Dispense Supply'}
            </h2>
            <p className="text-[.78rem] text-bone-600 mb-5">
              Record audit changes to <span className="text-teal-400 font-semibold">{selectedItem.name}</span>.
            </p>
            <form onSubmit={handleTransaction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">
                  Quantity ({selectedItem.unit}s) *
                </label>
                <input name="quantity" type="number" required min={1} placeholder="e.g. 5" className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all font-mono text-[.82rem]" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[.72rem] font-semibold text-bone-600 uppercase tracking-widest">Reason / Transaction Notes *</label>
                <input name="reason" required placeholder={txType === 'IN' ? 'Monthly stock restocking shipment' : 'Issued for in-clinic session treatment'} className="bg-physio-navy border border-teal-500/10 rounded-md text-bone-300 px-4 py-2.5 outline-none focus:border-teal-500 transition-all text-[.82rem]" />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsTxModalOpen(false)} className="text-teal-400 border border-teal-500/50 bg-transparent hover:bg-teal-500/10 px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all">Cancel</button>
                <button type="submit" className={`px-5 py-2.5 rounded-md font-semibold text-[.78rem] transition-all text-physio-deep ${txType === 'IN' ? 'bg-teal-500 hover:bg-teal-400' : 'bg-red-500 hover:bg-red-400'}`}>
                  Record {txType === 'IN' ? 'Restock' : 'Dispense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
