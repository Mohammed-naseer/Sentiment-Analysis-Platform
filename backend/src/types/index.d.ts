declare namespace Express {
  export interface Request {
    user?: {
      _id: string; // MongoDB User document ObjectId
      uid: string;  // Firebase UID
      email: string;
      name?: string;
      photoURL?: string;
      role: 'Admin' | 'Analyst' | 'Viewer' | 'Reader' | 'Pending';
      status: 'Pending' | 'Approved' | 'Rejected';
      approved: boolean;
    };
  }
}
