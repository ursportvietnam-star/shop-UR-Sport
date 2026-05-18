export const BANK_TRANSFER_INFO = {
  bankId: 'MB',
  bankName: 'MB BANK (Ngân hàng Quân Đội)',
  accountNumber: '0917722425',
  accountName: 'NGUYEN BAO',
};

export const createOrderCode = () => `UR${Date.now().toString().slice(-8)}`;

export const getPaymentLabel = (paymentMethod?: string) => {
  switch (paymentMethod) {
    case 'bank_transfer':
      return 'Chuyển khoản ngân hàng';
    case 'momo':
      return 'Momo';
    case 'zalopay':
      return 'ZaloPay';
    case 'shopeepay':
      return 'ShopeePay';
    case 'cod':
      return 'Thanh toán khi nhận hàng';
    default:
      return 'Thanh toán chuyển khoản';
  }
};

export const getTransferContent = (orderCode?: string, orderId?: string) => {
  const code = orderCode || (orderId ? `UR${orderId.slice(0, 8).toUpperCase()}` : 'URSPORT');
  return `${code} URSPORT`;
};

export const getVietQrUrl = ({
  amount,
  transferContent,
}: {
  amount: number;
  transferContent: string;
}) => {
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount || 0))),
    addInfo: transferContent,
    accountName: BANK_TRANSFER_INFO.accountName,
  });

  return `https://img.vietqr.io/image/${BANK_TRANSFER_INFO.bankId}-${BANK_TRANSFER_INFO.accountNumber}-compact2.jpg?${params.toString()}`;
};
