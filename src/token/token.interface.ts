export interface Token {
  amount: number;
  id: string;
}

export interface PaymentRequest extends Token {
  paymentPointer: string;
}
