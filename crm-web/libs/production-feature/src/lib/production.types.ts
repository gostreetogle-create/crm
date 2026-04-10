export type ProductionStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export type ProductionAssignment = {
  id: string;
  orderId?: string;
  lineNo: number;
  workerId: string;
  workerName?: string;
  startDate: string | null;
  endDate: string | null;
  status: ProductionStatus;
};

export type ProductionLineSnapshot = {
  lineNo: number;
  title?: string;
  name: string;
  quantity?: number;
  qty: number;
  unit: string;
};

export type ProductionOrder = {
  id: string;
  orderNumber: string;
  customerLabel: string;
  createdAt?: string | null;
  productionStart?: string | null;
  deadline: string | null;
  productionStatus: ProductionStatus;
  assignments: ProductionAssignment[];
  linesSnapshot?: ProductionLineSnapshot[];
};

export type ProductionOrderDetail = {
  id: string;
  orderNumber: string;
  customerLabel: string;
  deadline: string | null;
  productionStatus: ProductionStatus;
  linesSnapshot: ProductionLineSnapshot[];
  assignments: ProductionAssignment[];
};

export type Worker = {
  id: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  name?: string;
};

export type AssignPayload = {
  lineNo: number;
  workerId: string;
  startDate: string;
  endDate: string;
  status?: ProductionStatus;
};

export type UpdateAssignmentPayload = {
  workerId?: string;
  startDate?: string;
  endDate?: string;
  status?: ProductionStatus;
};
