import { createHash, randomUUID } from "crypto";

import {
  InvitationRole,
  OrderStatus,
  OrderType,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD_HASH_ROUNDS = 12;
const DEFAULT_PASSWORD = "Password123!";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

async function main() {
  console.log("🌱 Seeding database...");

  // FK 역순으로 초기화 (재실행 가능하게)
  await prisma.refreshToken.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash(
    DEFAULT_PASSWORD,
    PASSWORD_HASH_ROUNDS,
  );

  // ---------- Companies (2) ----------
  const companyA = await prisma.company.create({
    data: {
      id: randomUUID(),
      name: "스낵팩토리",
      businessNumber: "123-45-67890",
      defaultMonthlyBudget: 500000,
    },
  });

  const companyB = await prisma.company.create({
    data: {
      id: randomUUID(),
      name: "오피스바이트",
      businessNumber: "234-56-78901",
      defaultMonthlyBudget: 300000,
    },
  });

  // ---------- Users (8) ----------
  const [
    superAdminA,
    adminA,
    userA1,
    userA2,
    userA3,
    superAdminB,
    adminB,
    userB1,
  ] = await Promise.all([
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyA.id,
        name: "김최고",
        email: "super@snackfactory.com",
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyA.id,
        name: "이관리",
        email: "admin@snackfactory.com",
        passwordHash,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyA.id,
        name: "박직원",
        email: "user1@snackfactory.com",
        passwordHash,
        role: UserRole.USER,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyA.id,
        name: "최사원",
        email: "user2@snackfactory.com",
        passwordHash,
        role: UserRole.USER,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyA.id,
        name: "정퇴사",
        email: "withdrawn@snackfactory.com",
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.WITHDRAWN,
        withdrawnAt: daysAgo(10),
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyB.id,
        name: "한대표",
        email: "super@officebite.com",
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyB.id,
        name: "오관리",
        email: "admin@officebite.com",
        passwordHash,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        id: randomUUID(),
        companyId: companyB.id,
        name: "윤직원",
        email: "user1@officebite.com",
        passwordHash,
        role: UserRole.USER,
      },
    }),
  ]);

  // ---------- Invitations (4) ----------
  await prisma.invitation.createMany({
    data: [
      {
        companyId: companyA.id,
        name: "신규초대",
        email: "invitee1@snackfactory.com",
        role: InvitationRole.USER,
        tokenHash: hashToken("invite-token-a1"),
        expiresAt: daysFromNow(7),
        isUsed: false,
      },
      {
        companyId: companyA.id,
        name: "관리자초대",
        email: "invitee-admin@snackfactory.com",
        role: InvitationRole.ADMIN,
        tokenHash: hashToken("invite-token-a2"),
        expiresAt: daysFromNow(3),
        isUsed: false,
      },
      {
        companyId: companyA.id,
        name: "사용완료초대",
        email: "used@snackfactory.com",
        role: InvitationRole.USER,
        tokenHash: hashToken("invite-token-used"),
        expiresAt: daysFromNow(1),
        isUsed: true,
      },
      {
        companyId: companyB.id,
        name: "바이트초대",
        email: "invitee1@officebite.com",
        role: InvitationRole.USER,
        tokenHash: hashToken("invite-token-b1"),
        expiresAt: daysFromNow(14),
        isUsed: false,
      },
    ],
  });

  // ---------- Categories (대분류 3 + 소분류 7) ----------
  const catSnack = await prisma.category.create({
    data: {
      id: randomUUID(),
      name: "과자/스낵",
      depth: 1,
    },
  });
  const catDrink = await prisma.category.create({
    data: {
      id: randomUUID(),
      name: "음료",
      depth: 1,
    },
  });
  const catInstant = await prisma.category.create({
    data: {
      id: randomUUID(),
      name: "간편식",
      depth: 1,
    },
  });

  const [
    catChips,
    catCookies,
    catCandy,
    catCoffee,
    catJuice,
    catRamen,
    catMeal,
  ] = await Promise.all([
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catSnack.id,
        name: "칩/스낵",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catSnack.id,
        name: "쿠키/비스킷",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catSnack.id,
        name: "캔디/젤리",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catDrink.id,
        name: "커피/차",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catDrink.id,
        name: "주스/탄산",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catInstant.id,
        name: "라면/면류",
        depth: 2,
      },
    }),
    prisma.category.create({
      data: {
        id: randomUUID(),
        parentId: catInstant.id,
        name: "즉석밥/컵밥",
        depth: 2,
      },
    }),
  ]);

  // ---------- Products (16) ----------
  const productDefs = [
    {
      companyId: companyA.id,
      categoryId: catChips.id,
      categoryName: "칩/스낵",
      createdById: adminA.id,
      name: "포카칩 오리지널",
      price: 1500,
      stock: 120,
      purchaseCount: 45,
      imageUrl: "https://example.com/images/pocachip.jpg",
      productUrl: "https://example.com/products/pocachip",
    },
    {
      companyId: companyA.id,
      categoryId: catChips.id,
      categoryName: "칩/스낵",
      createdById: adminA.id,
      name: "허니버터칩",
      price: 1800,
      stock: 80,
      purchaseCount: 62,
      imageUrl: "https://example.com/images/honeybutter.jpg",
      productUrl: "https://example.com/products/honeybutter",
    },
    {
      companyId: companyA.id,
      categoryId: catCookies.id,
      categoryName: "쿠키/비스킷",
      createdById: adminA.id,
      name: "초코파이",
      price: 4000,
      stock: 60,
      purchaseCount: 30,
      imageUrl: "https://example.com/images/chocopie.jpg",
      productUrl: "https://example.com/products/chocopie",
    },
    {
      companyId: companyA.id,
      categoryId: catCookies.id,
      categoryName: "쿠키/비스킷",
      createdById: superAdminA.id,
      name: "오리온 고소미",
      price: 2500,
      stock: 90,
      purchaseCount: 22,
      imageUrl: "https://example.com/images/gosomi.jpg",
      productUrl: "https://example.com/products/gosomi",
    },
    {
      companyId: companyA.id,
      categoryId: catCandy.id,
      categoryName: "캔디/젤리",
      createdById: adminA.id,
      name: "마이구미 포도",
      price: 1200,
      stock: 150,
      purchaseCount: 55,
      imageUrl: "https://example.com/images/mygummi.jpg",
      productUrl: "https://example.com/products/mygummi",
    },
    {
      companyId: companyA.id,
      categoryId: catCoffee.id,
      categoryName: "커피/차",
      createdById: adminA.id,
      name: "칸타타 아메리카노",
      price: 2200,
      stock: 100,
      purchaseCount: 70,
      imageUrl: "https://example.com/images/cantata.jpg",
      productUrl: "https://example.com/products/cantata",
    },
    {
      companyId: companyA.id,
      categoryId: catCoffee.id,
      categoryName: "커피/차",
      createdById: adminA.id,
      name: "맥심 모카골드",
      price: 8000,
      stock: 40,
      purchaseCount: 18,
      imageUrl: "https://example.com/images/maxim.jpg",
      productUrl: "https://example.com/products/maxim",
    },
    {
      companyId: companyA.id,
      categoryId: catJuice.id,
      categoryName: "주스/탄산",
      createdById: adminA.id,
      name: "코카콜라 355ml",
      price: 1600,
      stock: 200,
      purchaseCount: 88,
      imageUrl: "https://example.com/images/coke.jpg",
      productUrl: "https://example.com/products/coke",
    },
    {
      companyId: companyA.id,
      categoryId: catRamen.id,
      categoryName: "라면/면류",
      createdById: adminA.id,
      name: "신라면",
      price: 1100,
      stock: 180,
      purchaseCount: 95,
      imageUrl: "https://example.com/images/shinramen.jpg",
      productUrl: "https://example.com/products/shinramen",
    },
    {
      companyId: companyA.id,
      categoryId: catMeal.id,
      categoryName: "즉석밥/컵밥",
      createdById: adminA.id,
      name: "햇반 210g",
      price: 1900,
      stock: 70,
      purchaseCount: 40,
      imageUrl: "https://example.com/images/hetbahn.jpg",
      productUrl: "https://example.com/products/hetbahn",
    },
    {
      companyId: companyB.id,
      categoryId: catChips.id,
      categoryName: "칩/스낵",
      createdById: adminB.id,
      name: "새우깡",
      price: 1400,
      stock: 110,
      purchaseCount: 33,
      imageUrl: "https://example.com/images/saeukkang.jpg",
      productUrl: "https://example.com/products/saeukkang",
    },
    {
      companyId: companyB.id,
      categoryId: catCookies.id,
      categoryName: "쿠키/비스킷",
      createdById: adminB.id,
      name: "홈런볼 초코",
      price: 2800,
      stock: 50,
      purchaseCount: 27,
      imageUrl: "https://example.com/images/homerunball.jpg",
      productUrl: "https://example.com/products/homerunball",
    },
    {
      companyId: companyB.id,
      categoryId: catCoffee.id,
      categoryName: "커피/차",
      createdById: superAdminB.id,
      name: "스타벅스 더블샷",
      price: 2900,
      stock: 65,
      purchaseCount: 41,
      imageUrl: "https://example.com/images/doubleshot.jpg",
      productUrl: "https://example.com/products/doubleshot",
    },
    {
      companyId: companyB.id,
      categoryId: catJuice.id,
      categoryName: "주스/탄산",
      createdById: adminB.id,
      name: "스프라이트 355ml",
      price: 1500,
      stock: 90,
      purchaseCount: 20,
      imageUrl: "https://example.com/images/sprite.jpg",
      productUrl: "https://example.com/products/sprite",
    },
    {
      companyId: companyB.id,
      categoryId: catRamen.id,
      categoryName: "라면/면류",
      createdById: adminB.id,
      name: "진라면 매운맛",
      price: 1000,
      stock: 140,
      purchaseCount: 50,
      imageUrl: "https://example.com/images/jinramen.jpg",
      productUrl: "https://example.com/products/jinramen",
    },
    {
      companyId: companyB.id,
      categoryId: catMeal.id,
      categoryName: "즉석밥/컵밥",
      createdById: adminB.id,
      name: "컵밥 불고기",
      price: 3500,
      stock: 35,
      purchaseCount: 15,
      imageUrl: "https://example.com/images/cupbap.jpg",
      productUrl: "https://example.com/products/cupbap",
    },
  ] as const;

  const products = await Promise.all(
    productDefs.map(({ categoryName: _categoryName, ...data }) =>
      prisma.product.create({
        data: {
          id: randomUUID(),
          ...data,
        },
      }),
    ),
  );

  const productMeta = products.map((product, index) => ({
    product,
    categoryName: productDefs[index].categoryName,
  }));

  const productsA = productMeta.filter(
    (item) => item.product.companyId === companyA.id,
  );
  const productsB = productMeta.filter(
    (item) => item.product.companyId === companyB.id,
  );

  // ---------- Budgets (회사별 최근 3개월) ----------
  await prisma.budget.createMany({
    data: [
      {
        id: randomUUID(),
        companyId: companyA.id,
        yearMonth: "2026-06",
        amount: 450000,
      },
      {
        id: randomUUID(),
        companyId: companyA.id,
        yearMonth: "2026-07",
        amount: 500000,
      },
      {
        id: randomUUID(),
        companyId: companyA.id,
        yearMonth: "2026-08",
        amount: 500000,
      },
      {
        id: randomUUID(),
        companyId: companyB.id,
        yearMonth: "2026-06",
        amount: 280000,
      },
      {
        id: randomUUID(),
        companyId: companyB.id,
        yearMonth: "2026-07",
        amount: 300000,
      },
      {
        id: randomUUID(),
        companyId: companyB.id,
        yearMonth: "2026-08",
        amount: 300000,
      },
    ],
  });

  // ---------- Orders + OrderItems ----------
  type SeedOrderItem = {
    productId: string;
    unitPrice: number;
    quantity: number;
    productName: string;
    imageUrl: string | null;
    categoryName: string;
  };

  const buildOrderItems = (
    items: SeedOrderItem[],
  ): {
    orderItems: (SeedOrderItem & { subtotal: number })[];
    productAmount: number;
  } => {
    const orderItems = items.map((item) => ({
      ...item,
      subtotal: item.unitPrice * item.quantity,
    }));
    const productAmount = orderItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    return { orderItems, productAmount };
  };

  const shippingFee = 3000;

  const orderSpecs: Array<{
    companyId: string;
    requesterId: string;
    processorId: string | null;
    type: OrderType;
    status: OrderStatus;
    requestMessage: string | null;
    responseMessage: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    items: SeedOrderItem[];
  }> = [
    {
      companyId: companyA.id,
      requesterId: userA1.id,
      processorId: null,
      type: OrderType.REQUEST,
      status: OrderStatus.PENDING,
      requestMessage: "간식 부족해서 요청합니다.",
      responseMessage: null,
      approvedAt: null,
      createdAt: daysAgo(1),
      items: [
        {
          productId: productsA[0].product.id,
          unitPrice: productsA[0].product.price,
          quantity: 10,
          productName: productsA[0].product.name,
          imageUrl: productsA[0].product.imageUrl,
          categoryName: productsA[0].categoryName,
        },
        {
          productId: productsA[5].product.id,
          unitPrice: productsA[5].product.price,
          quantity: 5,
          productName: productsA[5].product.name,
          imageUrl: productsA[5].product.imageUrl,
          categoryName: productsA[5].categoryName,
        },
      ],
    },
    {
      companyId: companyA.id,
      requesterId: userA2.id,
      processorId: adminA.id,
      type: OrderType.REQUEST,
      status: OrderStatus.APPROVED,
      requestMessage: "회의실 간식용입니다.",
      responseMessage: "승인되었습니다.",
      approvedAt: daysAgo(3),
      createdAt: daysAgo(4),
      items: [
        {
          productId: productsA[1].product.id,
          unitPrice: productsA[1].product.price,
          quantity: 8,
          productName: productsA[1].product.name,
          imageUrl: productsA[1].product.imageUrl,
          categoryName: productsA[1].categoryName,
        },
        {
          productId: productsA[2].product.id,
          unitPrice: productsA[2].product.price,
          quantity: 3,
          productName: productsA[2].product.name,
          imageUrl: productsA[2].product.imageUrl,
          categoryName: productsA[2].categoryName,
        },
      ],
    },
    {
      companyId: companyA.id,
      requesterId: userA1.id,
      processorId: adminA.id,
      type: OrderType.REQUEST,
      status: OrderStatus.REJECTED,
      requestMessage: "야근용 라면 부탁드려요.",
      responseMessage: "이번 달 예산이 부족합니다.",
      approvedAt: null,
      createdAt: daysAgo(6),
      items: [
        {
          productId: productsA[8].product.id,
          unitPrice: productsA[8].product.price,
          quantity: 20,
          productName: productsA[8].product.name,
          imageUrl: productsA[8].product.imageUrl,
          categoryName: productsA[8].categoryName,
        },
      ],
    },
    {
      companyId: companyA.id,
      requesterId: userA2.id,
      processorId: null,
      type: OrderType.REQUEST,
      status: OrderStatus.CANCELLED,
      requestMessage: "잘못 신청해서 취소합니다.",
      responseMessage: null,
      approvedAt: null,
      createdAt: daysAgo(8),
      items: [
        {
          productId: productsA[4].product.id,
          unitPrice: productsA[4].product.price,
          quantity: 4,
          productName: productsA[4].product.name,
          imageUrl: productsA[4].product.imageUrl,
          categoryName: productsA[4].categoryName,
        },
      ],
    },
    {
      companyId: companyA.id,
      requesterId: adminA.id,
      processorId: adminA.id,
      type: OrderType.DIRECT,
      status: OrderStatus.APPROVED,
      requestMessage: null,
      responseMessage: "관리자 직접 구매",
      approvedAt: daysAgo(2),
      createdAt: daysAgo(2),
      items: [
        {
          productId: productsA[6].product.id,
          unitPrice: productsA[6].product.price,
          quantity: 2,
          productName: productsA[6].product.name,
          imageUrl: productsA[6].product.imageUrl,
          categoryName: productsA[6].categoryName,
        },
        {
          productId: productsA[7].product.id,
          unitPrice: productsA[7].product.price,
          quantity: 12,
          productName: productsA[7].product.name,
          imageUrl: productsA[7].product.imageUrl,
          categoryName: productsA[7].categoryName,
        },
        {
          productId: productsA[9].product.id,
          unitPrice: productsA[9].product.price,
          quantity: 6,
          productName: productsA[9].product.name,
          imageUrl: productsA[9].product.imageUrl,
          categoryName: productsA[9].categoryName,
        },
      ],
    },
    {
      companyId: companyB.id,
      requesterId: userB1.id,
      processorId: null,
      type: OrderType.REQUEST,
      status: OrderStatus.PENDING,
      requestMessage: "탕비실 채워주세요.",
      responseMessage: null,
      approvedAt: null,
      createdAt: daysAgo(0),
      items: [
        {
          productId: productsB[0].product.id,
          unitPrice: productsB[0].product.price,
          quantity: 15,
          productName: productsB[0].product.name,
          imageUrl: productsB[0].product.imageUrl,
          categoryName: productsB[0].categoryName,
        },
        {
          productId: productsB[2].product.id,
          unitPrice: productsB[2].product.price,
          quantity: 6,
          productName: productsB[2].product.name,
          imageUrl: productsB[2].product.imageUrl,
          categoryName: productsB[2].categoryName,
        },
      ],
    },
    {
      companyId: companyB.id,
      requesterId: userB1.id,
      processorId: adminB.id,
      type: OrderType.REQUEST,
      status: OrderStatus.APPROVED,
      requestMessage: "점심 대용 컵밥 요청",
      responseMessage: "승인 완료",
      approvedAt: daysAgo(5),
      createdAt: daysAgo(5),
      items: [
        {
          productId: productsB[5].product.id,
          unitPrice: productsB[5].product.price,
          quantity: 4,
          productName: productsB[5].product.name,
          imageUrl: productsB[5].product.imageUrl,
          categoryName: productsB[5].categoryName,
        },
      ],
    },
    {
      companyId: companyB.id,
      requesterId: adminB.id,
      processorId: adminB.id,
      type: OrderType.DIRECT,
      status: OrderStatus.APPROVED,
      requestMessage: null,
      responseMessage: "정기 보충",
      approvedAt: daysAgo(7),
      createdAt: daysAgo(7),
      items: [
        {
          productId: productsB[1].product.id,
          unitPrice: productsB[1].product.price,
          quantity: 5,
          productName: productsB[1].product.name,
          imageUrl: productsB[1].product.imageUrl,
          categoryName: productsB[1].categoryName,
        },
        {
          productId: productsB[3].product.id,
          unitPrice: productsB[3].product.price,
          quantity: 10,
          productName: productsB[3].product.name,
          imageUrl: productsB[3].product.imageUrl,
          categoryName: productsB[3].categoryName,
        },
        {
          productId: productsB[4].product.id,
          unitPrice: productsB[4].product.price,
          quantity: 10,
          productName: productsB[4].product.name,
          imageUrl: productsB[4].product.imageUrl,
          categoryName: productsB[4].categoryName,
        },
      ],
    },
  ];

  for (const spec of orderSpecs) {
    const { orderItems, productAmount } = buildOrderItems(
      spec.items,
    );
    const fee =
      spec.status === OrderStatus.CANCELLED ||
      spec.status === OrderStatus.REJECTED
        ? 0
        : shippingFee;

    await prisma.order.create({
      data: {
        id: randomUUID(),
        companyId: spec.companyId,
        requesterId: spec.requesterId,
        processorId: spec.processorId,
        type: spec.type,
        status: spec.status,
        productAmount,
        shippingFee: fee,
        totalPrice: productAmount + fee,
        requestMessage: spec.requestMessage,
        responseMessage: spec.responseMessage,
        approvedAt: spec.approvedAt,
        createdAt: spec.createdAt,
        updatedAt: spec.createdAt,
        orderItems: {
          create: orderItems.map((item) => ({
            id: randomUUID(),
            productId: item.productId,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            productName: item.productName,
            imageUrl: item.imageUrl,
            categoryName: item.categoryName,
            createdAt: spec.createdAt,
          })),
        },
      },
    });
  }

  // ---------- CartItems (5) ----------
  await prisma.cartItem.createMany({
    data: [
      {
        id: randomUUID(),
        userId: userA1.id,
        productId: productsA[0].product.id,
        quantity: 3,
      },
      {
        id: randomUUID(),
        userId: userA1.id,
        productId: productsA[8].product.id,
        quantity: 2,
      },
      {
        id: randomUUID(),
        userId: userA2.id,
        productId: productsA[5].product.id,
        quantity: 5,
      },
      {
        id: randomUUID(),
        userId: userB1.id,
        productId: productsB[0].product.id,
        quantity: 4,
      },
      {
        id: randomUUID(),
        userId: userB1.id,
        productId: productsB[2].product.id,
        quantity: 1,
      },
    ],
  });

  // ---------- RefreshTokens (2) ----------
  await prisma.refreshToken.createMany({
    data: [
      {
        id: randomUUID(),
        userId: userA1.id,
        tokenHash: hashToken("seed-refresh-token-user-a1"),
        expiresAt: daysFromNow(14),
      },
      {
        id: randomUUID(),
        userId: adminA.id,
        tokenHash: hashToken("seed-refresh-token-admin-a"),
        expiresAt: daysFromNow(14),
      },
    ],
  });

  console.log("✅ Seed completed");
  console.log("");
  console.log("📦 Summary");
  console.log("  companies      : 2");
  console.log("  users          : 8");
  console.log("  invitations    : 4");
  console.log("  categories     : 10 (3 parent + 7 child)");
  console.log("  products       : 16");
  console.log("  budgets        : 6");
  console.log("  orders         : 8");
  console.log("  order_items    : ~16");
  console.log("  cart_items     : 5");
  console.log("  refresh_tokens : 2");
  console.log("");
  console.log(`🔑 공통 비밀번호: ${DEFAULT_PASSWORD}`);
  console.log("  [스낵팩토리]");
  console.log("  super@snackfactory.com     (SUPER_ADMIN)");
  console.log("  admin@snackfactory.com     (ADMIN)");
  console.log("  user1@snackfactory.com     (USER)");
  console.log("  user2@snackfactory.com     (USER)");
  console.log("  withdrawn@snackfactory.com (USER, WITHDRAWN)");
  console.log("  [오피스바이트]");
  console.log("  super@officebite.com       (SUPER_ADMIN)");
  console.log("  admin@officebite.com       (ADMIN)");
  console.log("  user1@officebite.com       (USER)");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
