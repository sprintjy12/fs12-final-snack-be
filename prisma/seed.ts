import { createHash, randomUUID } from "crypto";

import {
  InvitationRole,
  OrderStatus,
  OrderType,
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PASSWORD_HASH_ROUNDS = 12;
const DEFAULT_PASSWORD = "Password123!";
const SEED_TX_TIMEOUT_MS = 180_000;
const MIN_ROWS = 32;

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

const yearMonthOffset = (monthsAgo: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const padBiz = (n: number) => {
  const raw = String(1000000000 + n).slice(0, 10);
  return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
};

/** DATABASE_URL에서 비밀번호를 제외한 연결 대상 정보 */
const getDatabaseTarget = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { raw: "(DATABASE_URL not set)" };
  }

  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, "") || "(unknown)",
      user: url.username || "(unknown)",
    };
  } catch {
    return { raw: "(invalid DATABASE_URL)" };
  }
};

/**
 * 시드는 전체 테이블을 비운 뒤 다시 채운다.
 * SSH 터널(localhost → RDS) 환경에서 실수로 원격 DB를 지우지 않도록 가드한다.
 */
const assertSafeToSeed = () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed aborted: NODE_ENV=production 에서는 시드를 실행할 수 없습니다.",
    );
  }

  if (process.env.ALLOW_DB_SEED !== "true") {
    throw new Error(
      [
        "Seed aborted: 명시적 허용이 필요합니다.",
        "  ALLOW_DB_SEED=true npm run db:seed",
        "",
        "주의: npm run ssh 터널이 켜져 있으면 localhost도 원격 RDS입니다.",
      ].join("\n"),
    );
  }

  const target = getDatabaseTarget();
  console.log("🎯 Seed target DB:");
  if ("raw" in target) {
    console.log(`  ${target.raw}`);
  } else {
    console.log(`  host     : ${target.host}`);
    console.log(`  port     : ${target.port}`);
    console.log(`  database : ${target.database}`);
    console.log(`  user     : ${target.user}`);
  }
  console.log("");
};

type SeedOrderItem = {
  productId: string;
  unitPrice: number;
  quantity: number;
  productName: string;
  imageUrl: string | null;
  categoryName: string;
};

type ProductMeta = {
  product: {
    id: string;
    companyId: string;
    name: string;
    price: number;
    imageUrl: string | null;
  };
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

const toOrderItem = (
  meta: ProductMeta,
  quantity: number,
): SeedOrderItem => ({
  productId: meta.product.id,
  unitPrice: meta.product.price,
  quantity,
  productName: meta.product.name,
  imageUrl: meta.product.imageUrl,
  categoryName: meta.categoryName,
});

async function main() {
  assertSafeToSeed();

  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash(
    DEFAULT_PASSWORD,
    PASSWORD_HASH_ROUNDS,
  );

  const counts = {
    companies: 0,
    users: 0,
    invitations: 0,
    categories: 0,
    products: 0,
    budgets: 0,
    orders: 0,
    orderItems: 0,
    cartItems: 0,
    refreshTokens: 0,
  };

  await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // FK 역순으로 초기화 (재실행 가능하게)
      await tx.refreshToken.deleteMany();
      await tx.cartItem.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.product.deleteMany();
      await tx.category.deleteMany();
      await tx.budget.deleteMany();
      await tx.invitation.deleteMany();
      await tx.user.deleteMany();
      await tx.company.deleteMany();

      // ---------- Companies (기존 2 + 추가 = 32) ----------
      const companyA = await tx.company.create({
        data: {
          id: randomUUID(),
          name: "스낵팩토리",
          businessNumber: "123-45-67890",
          defaultMonthlyBudget: 500000,
        },
      });

      const companyB = await tx.company.create({
        data: {
          id: randomUUID(),
          name: "오피스바이트",
          businessNumber: "234-56-78901",
          defaultMonthlyBudget: 300000,
        },
      });

      const extraCompanyNames = [
        "스낵박스",
        "오피스스낵",
        "미니바이트",
        "카페코너",
        "간식창고",
        "바이트랩",
        "스낵허브",
        "오피스딜",
        "테이스트박스",
        "스낵스테이션",
        "바이트팩",
        "간식마켓",
        "스낵라운지",
        "오피스리필",
        "스낵클라우드",
        "바이트스토어",
        "페이스트리팩",
        "드링크박스",
        "밀키트존",
        "스낵플러스",
        "오피스고고",
        "간식딜리버리",
        "스낵앤모어",
        "바이트하우스",
        "카페스낵",
        "리필박스",
        "스낵웨이브",
        "오피스초이스",
        "테이스트허브",
        "스낵빌더",
      ];

      const extraCompanies = await Promise.all(
        extraCompanyNames.map((name, index) =>
          tx.company.create({
            data: {
              id: randomUUID(),
              name,
              businessNumber: padBiz(3000000000 + index + 1),
              defaultMonthlyBudget: 200000 + (index % 10) * 10000,
            },
          }),
        ),
      );

      const companies = [companyA, companyB, ...extraCompanies];
      counts.companies = companies.length;

      // ---------- Users (기존 계정 유지 + 추가 = 32+) ----------
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
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyA.id,
            name: "김최고",
            email: "super@snackfactory.com",
            passwordHash,
            role: UserRole.SUPER_ADMIN,
          },
        }),
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyA.id,
            name: "이관리",
            email: "admin@snackfactory.com",
            passwordHash,
            role: UserRole.ADMIN,
          },
        }),
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyA.id,
            name: "박직원",
            email: "user1@snackfactory.com",
            passwordHash,
            role: UserRole.USER,
          },
        }),
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyA.id,
            name: "최사원",
            email: "user2@snackfactory.com",
            passwordHash,
            role: UserRole.USER,
          },
        }),
        tx.user.create({
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
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyB.id,
            name: "한대표",
            email: "super@officebite.com",
            passwordHash,
            role: UserRole.SUPER_ADMIN,
          },
        }),
        tx.user.create({
          data: {
            id: randomUUID(),
            companyId: companyB.id,
            name: "오관리",
            email: "admin@officebite.com",
            passwordHash,
            role: UserRole.ADMIN,
          },
        }),
        tx.user.create({
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

      const koreanNames = [
        "김민수",
        "이서연",
        "박지훈",
        "최유진",
        "정하늘",
        "강다은",
        "윤도현",
        "임수빈",
        "한예준",
        "오채원",
        "신우진",
        "조하린",
        "배성민",
        "홍나경",
        "문지호",
        "서윤아",
        "권태영",
        "황소희",
        "노준혁",
        "유민재",
        "안서현",
        "송지안",
        "전우석",
        "표하은",
        "구민호",
        "남지은",
        "류성호",
        "석예림",
        "심동현",
        "위수아",
        "장현우",
        "차예솔",
        "표진우",
        "하서진",
      ];

      // 스낵팩토리 추가 유저 (페이지네이션용, ACTIVE 위주)
      const extraUsersA = await Promise.all(
        Array.from({ length: 28 }, (_, i) =>
          tx.user.create({
            data: {
              id: randomUUID(),
              companyId: companyA.id,
              name: koreanNames[i % koreanNames.length],
              email: `user${i + 3}@snackfactory.com`,
              passwordHash,
              role: i % 9 === 0 ? UserRole.ADMIN : UserRole.USER,
              ...(i === 27
                ? {
                    status: UserStatus.WITHDRAWN,
                    withdrawnAt: daysAgo(3),
                  }
                : {}),
            },
          }),
        ),
      );

      // 오피스바이트 추가 유저
      const extraUsersB = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          tx.user.create({
            data: {
              id: randomUUID(),
              companyId: companyB.id,
              name: koreanNames[(i + 5) % koreanNames.length],
              email: `user${i + 2}@officebite.com`,
              passwordHash,
              role: i === 0 ? UserRole.ADMIN : UserRole.USER,
            },
          }),
        ),
      );

      // 기타 회사: 회사당 SUPER_ADMIN + USER 1명
      const extraCompanyUsers = await Promise.all(
        extraCompanies.flatMap((company, index) => [
          tx.user.create({
            data: {
              id: randomUUID(),
              companyId: company.id,
              name: `${company.name} 대표`,
              email: `super@company${index + 1}.seed.com`,
              passwordHash,
              role: UserRole.SUPER_ADMIN,
            },
          }),
          tx.user.create({
            data: {
              id: randomUUID(),
              companyId: company.id,
              name: `${company.name} 직원`,
              email: `user@company${index + 1}.seed.com`,
              passwordHash,
              role: UserRole.USER,
            },
          }),
        ]),
      );

      const usersA = [
        superAdminA,
        adminA,
        userA1,
        userA2,
        userA3,
        ...extraUsersA,
      ];
      const usersB = [superAdminB, adminB, userB1, ...extraUsersB];
      const activeUsersA = usersA.filter(
        (u) => u.status === UserStatus.ACTIVE,
      );
      const requestersA = activeUsersA.filter(
        (u) => u.role === UserRole.USER || u.role === UserRole.ADMIN,
      );
      counts.users =
        usersA.length + usersB.length + extraCompanyUsers.length;

      // ---------- Invitations (32+) ----------
      const invitationData = [
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
        ...Array.from({ length: 28 }, (_, i) => ({
          companyId: i % 2 === 0 ? companyA.id : companyB.id,
          name: `추가초대${i + 1}`,
          email: `invitee${i + 10}@${i % 2 === 0 ? "snackfactory" : "officebite"}.com`,
          role: i % 5 === 0 ? InvitationRole.ADMIN : InvitationRole.USER,
          tokenHash: hashToken(`invite-token-extra-${i + 1}`),
          expiresAt: daysFromNow(1 + (i % 20)),
          isUsed: i % 7 === 0,
        })),
      ];

      await tx.invitation.createMany({ data: invitationData });
      counts.invitations = invitationData.length;

      // ---------- Categories (FE 고정 UUID 유지 + 확장 = 32+) ----------
      const FE_CAT = {
        snack: "00000000-0000-4000-8000-000000000001",
        drink: "00000000-0000-4000-8000-000000000002",
        meal: "00000000-0000-4000-8000-000000000004",
        snackChip: "00000000-0000-4000-8000-000000000101",
        snackCookie: "00000000-0000-4000-8000-000000000102",
        snackCandy: "00000000-0000-4000-8000-000000000103",
        soda: "00000000-0000-4000-8000-000000000011",
        drinkCoffee: "00000000-0000-4000-8000-000000000014",
        noodle: "00000000-0000-4000-8000-000000000041",
        instantMeal: "00000000-0000-4000-8000-000000000042",
      } as const;

      const catSnack = await tx.category.create({
        data: { id: FE_CAT.snack, name: "과자/스낵", depth: 1 },
      });
      const catDrink = await tx.category.create({
        data: { id: FE_CAT.drink, name: "음료", depth: 1 },
      });
      const catInstant = await tx.category.create({
        data: { id: FE_CAT.meal, name: "간편식", depth: 1 },
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
        tx.category.create({
          data: {
            id: FE_CAT.snackChip,
            parentId: catSnack.id,
            name: "칩/스낵",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.snackCookie,
            parentId: catSnack.id,
            name: "쿠키/비스킷",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.snackCandy,
            parentId: catSnack.id,
            name: "캔디/젤리",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.drinkCoffee,
            parentId: catDrink.id,
            name: "커피/차",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.soda,
            parentId: catDrink.id,
            name: "주스/탄산",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.noodle,
            parentId: catInstant.id,
            name: "라면/면류",
            depth: 2,
          },
        }),
        tx.category.create({
          data: {
            id: FE_CAT.instantMeal,
            parentId: catInstant.id,
            name: "즉석밥/컵밥",
            depth: 2,
          },
        }),
      ]);

      const catFresh = await tx.category.create({
        data: { id: randomUUID(), name: "신선식품", depth: 1 },
      });
      const catHealth = await tx.category.create({
        data: { id: randomUUID(), name: "건강간식", depth: 1 },
      });
      const catOffice = await tx.category.create({
        data: { id: randomUUID(), name: "오피스용품", depth: 1 },
      });

      const extraChildDefs: Array<{
        parentId: string;
        name: string;
      }> = [
        { parentId: catSnack.id, name: "견과/시리얼" },
        { parentId: catSnack.id, name: "초콜릿" },
        { parentId: catDrink.id, name: "생수/탄산수" },
        { parentId: catDrink.id, name: "에너지드링크" },
        { parentId: catDrink.id, name: "유제품/두유" },
        { parentId: catInstant.id, name: "즉석국/찌개" },
        { parentId: catInstant.id, name: "냉동간편식" },
        { parentId: catFresh.id, name: "과일" },
        { parentId: catFresh.id, name: "샐러드" },
        { parentId: catFresh.id, name: "요거트" },
        { parentId: catHealth.id, name: "프로틴바" },
        { parentId: catHealth.id, name: "저당과자" },
        { parentId: catHealth.id, name: "견과믹스" },
        { parentId: catOffice.id, name: "티백/원두" },
        { parentId: catOffice.id, name: "일회용컵/수저" },
        { parentId: catOffice.id, name: "청소/위생" },
        { parentId: catChips.id, name: "감자칩" },
        { parentId: catCookies.id, name: "파이" },
        { parentId: catCandy.id, name: "젤리" },
        { parentId: catCoffee.id, name: "캔커피" },
        { parentId: catJuice.id, name: "탄산음료" },
        { parentId: catRamen.id, name: "컵라면" },
        { parentId: catMeal.id, name: "컵밥" },
      ];

      // depth 3 children under depth-2 (schema allows hierarchy)
      const extraChildren = await Promise.all(
        extraChildDefs.map((def) =>
          tx.category.create({
            data: {
              id: randomUUID(),
              parentId: def.parentId,
              name: def.name,
              depth: def.parentId === catSnack.id ||
                def.parentId === catDrink.id ||
                def.parentId === catInstant.id ||
                def.parentId === catFresh.id ||
                def.parentId === catHealth.id ||
                def.parentId === catOffice.id
                ? 2
                : 3,
            },
          }),
        ),
      );

      const leafCategories = [
        { cat: catChips, name: "칩/스낵" },
        { cat: catCookies, name: "쿠키/비스킷" },
        { cat: catCandy, name: "캔디/젤리" },
        { cat: catCoffee, name: "커피/차" },
        { cat: catJuice, name: "주스/탄산" },
        { cat: catRamen, name: "라면/면류" },
        { cat: catMeal, name: "즉석밥/컵밥" },
        ...extraChildren
          .filter((c) => c.depth === 2)
          .map((c) => ({ cat: c, name: c.name })),
      ];

      counts.categories =
        3 + 7 + 3 + extraChildren.length; // parents + FE children + extra parents + extras

      // ---------- Products (스낵팩토리 32+ / 오피스바이트 16+ / 기타 회사 소량) ----------
      const namedProductDefsA = [
        {
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
      ];

      const productNamePool = [
        "새우깡",
        "양파링",
        "치토스",
        "프링글스",
        "꼬깔콘",
        "오징어땅콩",
        "홈런볼",
        "다이제",
        "몽쉘",
        "오레오",
        "빼빼로",
        "하리보",
        "젤리빈",
        "멘토스",
        "트윅스",
        "스니커즈",
        "바나나킥",
        "썬칩",
        "구운양파",
        "카라멜콘",
        "카페라떼캔",
        "레쓰비",
        "비타500",
        "포카리스웨트",
        "게토레이",
        "환타오렌지",
        "펩시",
        "칠성사이다",
        "진라면순한맛",
        "너구리",
        "짜파게티",
        "비빔면",
        "컵누들",
        "참깨라면",
        "팔도비빔면",
        "컵밥김치",
        "컵밥치킨",
        "즉석된장국",
        "프로틴바초코",
        "아몬드믹스",
      ].map((n) => n.trim());

      const generatedDefsA = Array.from(
        { length: MIN_ROWS - namedProductDefsA.length },
        (_, i) => {
          const leaf = leafCategories[i % leafCategories.length];
          const name = `${productNamePool[i % productNamePool.length]} ${i + 1}`;
          return {
            categoryId: leaf.cat.id,
            categoryName: leaf.name,
            createdById: i % 3 === 0 ? superAdminA.id : adminA.id,
            name,
            price: 1000 + (i % 20) * 200,
            stock: 20 + (i % 15) * 10,
            purchaseCount: i % 40,
            imageUrl: `https://example.com/images/product-a-${i + 1}.jpg`,
            productUrl: `https://example.com/products/product-a-${i + 1}`,
          };
        },
      );

      const productDefsA = [...namedProductDefsA, ...generatedDefsA];

      const namedProductDefsB = [
        {
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
      ];

      const generatedDefsB = Array.from({ length: 26 }, (_, i) => {
        const leaf = leafCategories[(i + 3) % leafCategories.length];
        return {
          categoryId: leaf.cat.id,
          categoryName: leaf.name,
          createdById: i % 4 === 0 ? superAdminB.id : adminB.id,
          name: `바이트 ${productNamePool[(i + 7) % productNamePool.length]} ${i + 1}`,
          price: 900 + (i % 18) * 150,
          stock: 15 + (i % 12) * 8,
          purchaseCount: (i * 3) % 50,
          imageUrl: `https://example.com/images/product-b-${i + 1}.jpg`,
          productUrl: `https://example.com/products/product-b-${i + 1}`,
        };
      });

      const productDefsB = [...namedProductDefsB, ...generatedDefsB];

      // 기타 회사: 회사당 1개 (관계 유지)
      const productDefsExtra = extraCompanies.map((company, index) => {
        const creator = extraCompanyUsers[index * 2]; // SUPER_ADMIN
        const leaf = leafCategories[index % leafCategories.length];
        return {
          companyId: company.id,
          categoryId: leaf.cat.id,
          categoryName: leaf.name,
          createdById: creator.id,
          name: `${company.name} 시그니처 스낵`,
          price: 1500 + (index % 10) * 100,
          stock: 30 + index,
          purchaseCount: index % 20,
          imageUrl: `https://example.com/images/product-c-${index + 1}.jpg`,
          productUrl: `https://example.com/products/product-c-${index + 1}`,
        };
      });

      const allProductDefs = [
        ...productDefsA.map((d) => ({ ...d, companyId: companyA.id })),
        ...productDefsB.map((d) => ({ ...d, companyId: companyB.id })),
        ...productDefsExtra,
      ];

      const products = await Promise.all(
        allProductDefs.map(({ categoryName: _categoryName, ...data }) =>
          tx.product.create({
            data: {
              id: randomUUID(),
              ...data,
            },
          }),
        ),
      );

      const productMeta: ProductMeta[] = products.map((product, index) => ({
        product,
        categoryName: allProductDefs[index].categoryName,
      }));

      const productsA = productMeta.filter(
        (item) => item.product.companyId === companyA.id,
      );
      const productsB = productMeta.filter(
        (item) => item.product.companyId === companyB.id,
      );
      counts.products = products.length;

      // ---------- Budgets (회사별 다개월 = 32+) ----------
      const budgetRows: Array<{
        id: string;
        companyId: string;
        yearMonth: string;
        amount: number;
      }> = [];

      // 스낵팩토리 / 오피스바이트: 최근 16개월씩
      for (const [company, base] of [
        [companyA, 500000],
        [companyB, 300000],
      ] as const) {
        for (let m = 0; m < 16; m++) {
          budgetRows.push({
            id: randomUUID(),
            companyId: company.id,
            yearMonth: yearMonthOffset(m),
            amount: base - (m % 5) * 10000,
          });
        }
      }

      // 기타 회사: 최근 1개월
      for (const [index, company] of extraCompanies.entries()) {
        budgetRows.push({
          id: randomUUID(),
          companyId: company.id,
          yearMonth: yearMonthOffset(0),
          amount: company.defaultMonthlyBudget + (index % 3) * 5000,
        });
      }

      await tx.budget.createMany({ data: budgetRows });
      counts.budgets = budgetRows.length;

      // ---------- Orders + OrderItems (스낵팩토리 32+ 주문) ----------
      const shippingFee = 3000;
      const statusesCycle = [
        OrderStatus.PENDING,
        OrderStatus.PENDING,
        OrderStatus.APPROVED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
        OrderStatus.APPROVED,
        OrderStatus.PENDING,
        OrderStatus.APPROVED,
      ] as const;

      const requestMessages = [
        "간식 부족해서 요청합니다.",
        "회의 다과 준비 부탁드립니다.",
        "탕비실 음료가 다 떨어졌어요.",
        "야근 간식 보충 요청드립니다.",
        "신입 환영회용 스낵 부탁드려요.",
        "커피머신용 원두/스낵 소량 요청",
        "정기 보충 부탁드립니다.",
        "팀 미팅용 간식 요청",
        null,
      ];

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
      }> = [];

      // 스낵팩토리 주문 36건
      for (let i = 0; i < 36; i++) {
        const status = statusesCycle[i % statusesCycle.length];
        const requester =
          requestersA[i % requestersA.length] ?? userA1;
        const isDirect = i % 11 === 0;
        const type = isDirect ? OrderType.DIRECT : OrderType.REQUEST;
        const needsProcessor =
          status === OrderStatus.APPROVED ||
          status === OrderStatus.REJECTED ||
          type === OrderType.DIRECT;

        const itemCount = 1 + (i % 4);
        const items = Array.from({ length: itemCount }, (_, j) => {
          const meta = productsA[(i + j * 3) % productsA.length];
          return toOrderItem(meta, 1 + ((i + j) % 12));
        });

        orderSpecs.push({
          companyId: companyA.id,
          requesterId: isDirect ? adminA.id : requester.id,
          processorId: needsProcessor ? adminA.id : null,
          type,
          status: isDirect ? OrderStatus.APPROVED : status,
          requestMessage:
            isDirect
              ? null
              : requestMessages[i % requestMessages.length],
          responseMessage:
            status === OrderStatus.APPROVED || isDirect
              ? i % 2 === 0
                ? "승인되었습니다."
                : "관리자 직접 구매"
              : status === OrderStatus.REJECTED
                ? "이번 달 예산이 부족합니다."
                : null,
          approvedAt:
            status === OrderStatus.APPROVED || isDirect
              ? daysAgo(Math.max(0, (i % 20) - 1))
              : null,
          createdAt: daysAgo(i % 40),
          items,
        });
      }

      // 오피스바이트 주문 12건
      const usersBActive = usersB.filter(
        (u) => u.status === UserStatus.ACTIVE,
      );
      for (let i = 0; i < 12; i++) {
        const status = statusesCycle[i % statusesCycle.length];
        const requester = usersBActive[i % usersBActive.length] ?? userB1;
        const needsProcessor =
          status === OrderStatus.APPROVED ||
          status === OrderStatus.REJECTED;

        orderSpecs.push({
          companyId: companyB.id,
          requesterId: requester.id,
          processorId: needsProcessor ? adminB.id : null,
          type: i % 5 === 0 ? OrderType.DIRECT : OrderType.REQUEST,
          status:
            i % 5 === 0 ? OrderStatus.APPROVED : status,
          requestMessage: "탕비실 채워주세요.",
          responseMessage:
            status === OrderStatus.APPROVED || i % 5 === 0
              ? "승인 완료"
              : status === OrderStatus.REJECTED
                ? "반려"
                : null,
          approvedAt:
            status === OrderStatus.APPROVED || i % 5 === 0
              ? daysAgo(i + 1)
              : null,
          createdAt: daysAgo(i + 1),
          items: [
            toOrderItem(
              productsB[i % productsB.length],
              2 + (i % 8),
            ),
            ...(i % 2 === 0
              ? [
                  toOrderItem(
                    productsB[(i + 2) % productsB.length],
                    1 + (i % 5),
                  ),
                ]
              : []),
          ],
        });
      }

      for (const spec of orderSpecs) {
        const { orderItems, productAmount } = buildOrderItems(spec.items);
        const fee =
          spec.status === OrderStatus.CANCELLED ||
          spec.status === OrderStatus.REJECTED
            ? 0
            : shippingFee;

        await tx.order.create({
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
        counts.orders += 1;
        counts.orderItems += orderItems.length;
      }

      // ---------- CartItems (userId+productId unique, 32+) ----------
      const cartRows: Array<{
        id: string;
        userId: string;
        productId: string;
        quantity: number;
      }> = [];
      const cartKeys = new Set<string>();

      const pushCart = (
        userId: string,
        productId: string,
        quantity: number,
      ) => {
        const key = `${userId}:${productId}`;
        if (cartKeys.has(key)) return;
        cartKeys.add(key);
        cartRows.push({
          id: randomUUID(),
          userId,
          productId,
          quantity,
        });
      };

      // 기존 시드 카트 패턴 유지
      pushCart(userA1.id, productsA[0].product.id, 3);
      pushCart(userA1.id, productsA[8].product.id, 2);
      pushCart(userA2.id, productsA[5].product.id, 5);
      pushCart(userB1.id, productsB[0].product.id, 4);
      pushCart(userB1.id, productsB[2].product.id, 1);

      for (let i = 0; i < activeUsersA.length && cartRows.length < 40; i++) {
        const user = activeUsersA[i];
        for (let j = 0; j < 2; j++) {
          const product = productsA[(i * 2 + j) % productsA.length].product;
          pushCart(user.id, product.id, 1 + ((i + j) % 5));
        }
      }

      for (let i = 0; i < usersBActive.length && cartRows.length < 50; i++) {
        const user = usersBActive[i];
        pushCart(
          user.id,
          productsB[i % productsB.length].product.id,
          1 + (i % 4),
        );
      }

      await tx.cartItem.createMany({ data: cartRows });
      counts.cartItems = cartRows.length;

      // ---------- RefreshTokens (32+) ----------
      const tokenUsers = [
        userA1,
        adminA,
        ...activeUsersA.slice(0, 20),
        ...usersBActive.slice(0, 10),
      ];
      const uniqueTokenUsers = Array.from(
        new Map(tokenUsers.map((u) => [u.id, u])).values(),
      ).slice(0, MIN_ROWS);

      const refreshRows = uniqueTokenUsers.map((user, i) => ({
        id: randomUUID(),
        userId: user.id,
        tokenHash: hashToken(
          i === 0
            ? "seed-refresh-token-user-a1"
            : i === 1
              ? "seed-refresh-token-admin-a"
              : `seed-refresh-token-${i + 1}`,
        ),
        expiresAt: daysFromNow(7 + (i % 14)),
      }));

      await tx.refreshToken.createMany({ data: refreshRows });
      counts.refreshTokens = refreshRows.length;
    },
    {
      maxWait: 10_000,
      timeout: SEED_TX_TIMEOUT_MS,
    },
  );

  console.log("✅ Seed completed");
  console.log("");
  console.log("📦 Summary");
  console.log(`  companies      : ${counts.companies}`);
  console.log(`  users          : ${counts.users}`);
  console.log(`  invitations    : ${counts.invitations}`);
  console.log(`  categories     : ${counts.categories}`);
  console.log(`  products       : ${counts.products}`);
  console.log(`  budgets        : ${counts.budgets}`);
  console.log(`  orders         : ${counts.orders}`);
  console.log(`  order_items    : ${counts.orderItems}`);
  console.log(`  cart_items     : ${counts.cartItems}`);
  console.log(`  refresh_tokens : ${counts.refreshTokens}`);
  console.log("");
  console.log(`🔑 공통 비밀번호: ${DEFAULT_PASSWORD}`);
  console.log("  [스낵팩토리] (기존 계정 유지)");
  console.log("  super@snackfactory.com     (SUPER_ADMIN)");
  console.log("  admin@snackfactory.com     (ADMIN)");
  console.log("  user1@snackfactory.com     (USER)");
  console.log("  user2@snackfactory.com     (USER)");
  console.log("  withdrawn@snackfactory.com (USER, WITHDRAWN)");
  console.log("  [오피스바이트] (기존 계정 유지)");
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
