'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RawSheet,
  TubeCapacity,
  ProductTechnical,
  DemandItem,
  ProductionPlanItem,
  IntegrationSettings,
  SheetLayout,
  BusinessRule,
  ProductionLine,
  UserRole,
  AuditLogEntry,
} from './types';
import {
  INITIAL_RAW_SHEETS,
  INITIAL_CAPACITIES,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCTION_PLAN,
  INITIAL_DEMAND_ITEMS,
  INITIAL_INTEGRATION_SETTINGS,
  INITIAL_SHEET_LAYOUTS,
  INITIAL_BUSINESS_RULES,
  INITIAL_PRODUCTION_LINES,
  INITIAL_USER_ROLES,
  INITIAL_AUDIT_LOGS,
} from './initial-data';

interface AppContextType {
  rawSheets: RawSheet[];
  capacities: TubeCapacity[];
  products: ProductTechnical[];
  demands: DemandItem[];
  productionPlans: ProductionPlanItem[];
  sheetLayouts: SheetLayout[];
  businessRules: BusinessRule[];
  productionLines: ProductionLine[];
  roles: UserRole[];
  currentRole: 'admin' | 'planner' | 'viewer';
  auditLogs: AuditLogEntry[];
  integrationSettings: IntegrationSettings;
  selectedDemandIds: string[];

  // Mutations
  setCurrentRole: (role: 'admin' | 'planner' | 'viewer') => void;
  setSelectedDemandIds: (ids: string[]) => void;
  toggleDemandSelection: (id: string) => void;
  updateDemand: (id: string, updated: Partial<DemandItem>) => void;
  addDemand: (item: DemandItem) => void;

  updateProduct: (code: string, updated: Partial<ProductTechnical>) => void;
  addProduct: (item: ProductTechnical) => void;
  deleteProduct: (code: string) => void;

  updateRawSheet: (code: string, updated: Partial<RawSheet>) => void;
  addRawSheet: (item: RawSheet) => void;

  updateSheetLayout: (id: string, updated: Partial<SheetLayout>) => void;
  addSheetLayout: (item: SheetLayout) => void;
  deleteSheetLayout: (id: string) => void;

  updateBusinessRule: (id: string, updated: Partial<BusinessRule>) => void;
  toggleBusinessRuleActive: (id: string) => void;

  updateProductionPlanItem: (id: string, updated: Partial<ProductionPlanItem>) => void;
  updateIntegrationSettings: (updated: Partial<IntegrationSettings>) => void;

  logAudit: (entityType: string, entityId: string, action: 'create' | 'update' | 'delete' | 'reset', details: string, prev?: string, next?: string) => void;
  resetAllDemoData: () => void;
  isHydrated: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  rawSheets: 'tp_raw_sheets_v2',
  capacities: 'tp_capacities_v2',
  products: 'tp_products_v2',
  demands: 'tp_demands_v2',
  productionPlans: 'tp_production_plans_v2',
  sheetLayouts: 'tp_sheet_layouts_v2',
  businessRules: 'tp_business_rules_v2',
  productionLines: 'tp_production_lines_v2',
  currentRole: 'tp_current_role_v2',
  auditLogs: 'tp_audit_logs_v2',
  integrationSettings: 'tp_integration_settings_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawSheets, setRawSheets] = useState<RawSheet[]>(INITIAL_RAW_SHEETS);
  const [capacities, setCapacities] = useState<TubeCapacity[]>(INITIAL_CAPACITIES);
  const [products, setProducts] = useState<ProductTechnical[]>(INITIAL_PRODUCTS);
  const [demands, setDemands] = useState<DemandItem[]>(INITIAL_DEMAND_ITEMS);
  const [productionPlans, setProductionPlans] = useState<ProductionPlanItem[]>(INITIAL_PRODUCTION_PLAN);
  const [sheetLayouts, setSheetLayouts] = useState<SheetLayout[]>(INITIAL_SHEET_LAYOUTS);
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>(INITIAL_BUSINESS_RULES);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>(INITIAL_PRODUCTION_LINES);
  const [roles] = useState<UserRole[]>(INITIAL_USER_ROLES);
  const [currentRole, setCurrentRoleState] = useState<'admin' | 'planner' | 'viewer'>('admin');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>(INITIAL_INTEGRATION_SETTINGS);
  const [selectedDemandIds, setSelectedDemandIds] = useState<string[]>(['DEM-001', 'DEM-002', 'DEM-003']);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const storedDemands = localStorage.getItem(STORAGE_KEYS.demands);
      if (storedDemands) setDemands(JSON.parse(storedDemands));

      const storedProducts = localStorage.getItem(STORAGE_KEYS.products);
      if (storedProducts) setProducts(JSON.parse(storedProducts));

      const storedRawSheets = localStorage.getItem(STORAGE_KEYS.rawSheets);
      if (storedRawSheets) setRawSheets(JSON.parse(storedRawSheets));

      const storedPlans = localStorage.getItem(STORAGE_KEYS.productionPlans);
      if (storedPlans) setProductionPlans(JSON.parse(storedPlans));

      const storedLayouts = localStorage.getItem(STORAGE_KEYS.sheetLayouts);
      if (storedLayouts) setSheetLayouts(JSON.parse(storedLayouts));

      const storedRules = localStorage.getItem(STORAGE_KEYS.businessRules);
      if (storedRules) setBusinessRules(JSON.parse(storedRules));

      const storedLines = localStorage.getItem(STORAGE_KEYS.productionLines);
      if (storedLines) setProductionLines(JSON.parse(storedLines));

      const storedRole = localStorage.getItem(STORAGE_KEYS.currentRole);
      if (storedRole) setCurrentRoleState(storedRole as any);

      const storedLogs = localStorage.getItem(STORAGE_KEYS.auditLogs);
      if (storedLogs) setAuditLogs(JSON.parse(storedLogs));

      const storedIntegration = localStorage.getItem(STORAGE_KEYS.integrationSettings);
      if (storedIntegration) setIntegrationSettings(JSON.parse(storedIntegration));
    } catch (e) {
      console.error('LocalStorage hydration error:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const logAudit = (
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete' | 'reset',
    details: string,
    prev?: string,
    next?: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user_name: currentRole === 'admin' ? 'Alper Ateş (Yönetici)' : currentRole === 'planner' ? 'Planlama Uzmanı' : 'Görüntüleyici',
      user_role: currentRole,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details,
      previous_value: prev || null,
      new_value: next || null,
    };
    const updated = [newEntry, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem(STORAGE_KEYS.auditLogs, JSON.stringify(updated));
  };

  const setCurrentRole = (role: 'admin' | 'planner' | 'viewer') => {
    setCurrentRoleState(role);
    localStorage.setItem(STORAGE_KEYS.currentRole, role);
    logAudit('user_role', role, 'update', `Aktif kullanıcı rolü değiştirildi: ${role}`);
  };

  const saveDemands = (next: DemandItem[]) => {
    setDemands(next);
    localStorage.setItem(STORAGE_KEYS.demands, JSON.stringify(next));
  };

  const saveProducts = (next: ProductTechnical[]) => {
    setProducts(next);
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(next));
  };

  const saveRawSheets = (next: RawSheet[]) => {
    setRawSheets(next);
    localStorage.setItem(STORAGE_KEYS.rawSheets, JSON.stringify(next));
  };

  const saveSheetLayouts = (next: SheetLayout[]) => {
    setSheetLayouts(next);
    localStorage.setItem(STORAGE_KEYS.sheetLayouts, JSON.stringify(next));
  };

  const saveBusinessRules = (next: BusinessRule[]) => {
    setBusinessRules(next);
    localStorage.setItem(STORAGE_KEYS.businessRules, JSON.stringify(next));
  };

  const saveProductionPlans = (next: ProductionPlanItem[]) => {
    setProductionPlans(next);
    localStorage.setItem(STORAGE_KEYS.productionPlans, JSON.stringify(next));
  };

  const toggleDemandSelection = (id: string) => {
    setSelectedDemandIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const updateDemand = (id: string, updated: Partial<DemandItem>) => {
    const next = demands.map((d) => (d.id === id ? { ...d, ...updated } : d));
    saveDemands(next);
    logAudit('demand', id, 'update', 'İhtiyaç kalemi güncellendi');
  };

  const addDemand = (item: DemandItem) => {
    const next = [item, ...demands];
    saveDemands(next);
    logAudit('demand', item.id, 'create', `Yeni talep eklendi: ${item.stock_name}`);
  };

  const updateProduct = (code: string, updated: Partial<ProductTechnical>) => {
    if (currentRole === 'viewer') return;
    const prev = products.find((p) => p.stock_code === code);
    const next = products.map((p) => (p.stock_code === code ? { ...p, ...updated } : p));
    saveProducts(next);
    logAudit('product', code, 'update', `Ürün kartı güncellendi: ${code}`, JSON.stringify(prev), JSON.stringify(updated));
  };

  const addProduct = (item: ProductTechnical) => {
    if (currentRole === 'viewer') return;
    const next = [item, ...products];
    saveProducts(next);
    logAudit('product', item.stock_code, 'create', `Yeni ürün kartı tanımlandı: ${item.stock_name}`);
  };

  const deleteProduct = (code: string) => {
    if (currentRole === 'viewer') return;
    const next = products.filter((p) => p.stock_code !== code);
    saveProducts(next);
    logAudit('product', code, 'delete', `Ürün kartı silindi: ${code}`);
  };

  const updateRawSheet = (code: string, updated: Partial<RawSheet>) => {
    if (currentRole === 'viewer') return;
    const next = rawSheets.map((r) => (r.stock_code === code ? { ...r, ...updated } : r));
    saveRawSheets(next);
    logAudit('raw_sheet', code, 'update', `Ham levha güncellendi: ${code}`);
  };

  const addRawSheet = (item: RawSheet) => {
    if (currentRole === 'viewer') return;
    const next = [item, ...rawSheets];
    saveRawSheets(next);
    logAudit('raw_sheet', item.stock_code, 'create', `Yeni ham levha eklendi: ${item.stock_name}`);
  };

  const updateSheetLayout = (id: string, updated: Partial<SheetLayout>) => {
    if (currentRole === 'viewer') return;
    const next = sheetLayouts.map((l) => (l.id === id ? { ...l, ...updated } : l));
    saveSheetLayouts(next);
    logAudit('sheet_layout', id, 'update', `Montaj düzeni güncellendi: ${id}`);
  };

  const addSheetLayout = (item: SheetLayout) => {
    if (currentRole === 'viewer') return;
    const next = [item, ...sheetLayouts];
    saveSheetLayouts(next);
    logAudit('sheet_layout', item.id, 'create', `Yeni montaj düzeni tanımlandı: ${item.tube_size} (${item.rows}x${item.cols})`);
  };

  const deleteSheetLayout = (id: string) => {
    if (currentRole === 'viewer') return;
    const next = sheetLayouts.filter((l) => l.id !== id);
    saveSheetLayouts(next);
    logAudit('sheet_layout', id, 'delete', `Montaj düzeni silindi: ${id}`);
  };

  const updateBusinessRule = (id: string, updated: Partial<BusinessRule>) => {
    if (currentRole !== 'admin') return;
    const next = businessRules.map((r) => (r.id === id ? { ...r, ...updated } : r));
    saveBusinessRules(next);
    logAudit('business_rule', id, 'update', `İş kuralı güncellendi: ${id}`);
  };

  const toggleBusinessRuleActive = (id: string) => {
    if (currentRole !== 'admin') return;
    const next = businessRules.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r));
    saveBusinessRules(next);
    const rule = next.find((r) => r.id === id);
    logAudit('business_rule', id, 'update', `Kural aktifliği değiştirildi: ${rule?.code} -> ${rule?.is_active}`);
  };

  const updateProductionPlanItem = (id: string, updated: Partial<ProductionPlanItem>) => {
    const next = productionPlans.map((p) => (p.id === id ? { ...p, ...updated } : p));
    saveProductionPlans(next);
    logAudit('production_plan', id, 'update', `Plan satırı güncellendi: ${id}`);
  };

  const updateIntegrationSettings = (updated: Partial<IntegrationSettings>) => {
    const next = { ...integrationSettings, ...updated };
    setIntegrationSettings(next);
    localStorage.setItem(STORAGE_KEYS.integrationSettings, JSON.stringify(next));
  };

  const resetAllDemoData = () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));

    setDemands(INITIAL_DEMAND_ITEMS);
    setProducts(INITIAL_PRODUCTS);
    setRawSheets(INITIAL_RAW_SHEETS);
    setCapacities(INITIAL_CAPACITIES);
    setSheetLayouts(INITIAL_SHEET_LAYOUTS);
    setBusinessRules(INITIAL_BUSINESS_RULES);
    setProductionLines(INITIAL_PRODUCTION_LINES);
    setCurrentRoleState('admin');
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setProductionPlans(INITIAL_PRODUCTION_PLAN);
    setIntegrationSettings(INITIAL_INTEGRATION_SETTINGS);
    setSelectedDemandIds(['DEM-001', 'DEM-002', 'DEM-003']);
    logAudit('system', 'ALL', 'reset', 'Tüm demo verileri varsayılan ayarlara sıfırlandı.');
  };

  return (
    <AppContext.Provider
      value={{
        rawSheets,
        capacities,
        products,
        demands,
        productionPlans,
        sheetLayouts,
        businessRules,
        productionLines,
        roles,
        currentRole,
        auditLogs,
        integrationSettings,
        selectedDemandIds,
        setCurrentRole,
        setSelectedDemandIds,
        toggleDemandSelection,
        updateDemand,
        addDemand,
        updateProduct,
        addProduct,
        deleteProduct,
        updateRawSheet,
        addRawSheet,
        updateSheetLayout,
        addSheetLayout,
        deleteSheetLayout,
        updateBusinessRule,
        toggleBusinessRuleActive,
        updateProductionPlanItem,
        updateIntegrationSettings,
        logAudit,
        resetAllDemoData,
        isHydrated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
