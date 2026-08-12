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
const SEED_TX_TIMEOUT_MS = 600_000;
const MIN_ROWS = 32;
const PRODUCTS_PER_COMPANY = 500;
const ORDERS_PER_COMPANY = 300;
const INVITATIONS_PER_COMPANY = 300;
const CART_ITEMS_TARGET = 300;
const CREATE_MANY_CHUNK = 500;

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

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

/** Unsplash 음식/스낵/음료 공개 이미지 (시드용) */
const SEED_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop", // chips
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop", // cookies
  "https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&h=400&fit=crop", // chocolate
  "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400&h=400&fit=crop", // candy
  "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&h=400&fit=crop", // nuts
  "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop", // soda
  "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop", // juice
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop", // coffee
  "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop", // tea
  "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop", // water
  "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop", // ramen
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop", // salad
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop", // bread
  "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop", // sandwich
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop", // yogurt
  "https://images.unsplash.com/photo-1521483451569-e33803c48038?w=400&h=400&fit=crop", // cereal
  "https://images.unsplash.com/photo-1619566636858-838d861447e8?w=400&h=400&fit=crop", // fruit
  "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop", // dessert
  "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=400&fit=crop", // matcha/drink
  "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop", // coffee beans
] as const;

const seedProductImageUrl = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return SEED_PRODUCT_IMAGES[hash % SEED_PRODUCT_IMAGES.length];
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

      // ---------- Users (기존 계정 유지 + 스낵팩토리 추가 48명) ----------
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
        "고나래",
        "도경수",
        "라은별",
        "마준서",
        "방소율",
        "사리원",
        "아윤호",
        "자민서",
        "차도윤",
        "카이안",
        "타수현",
        "파예나",
        "하수린",
        "강해린",
      ];

      // 스낵팩토리 추가 유저 (페이지네이션용, ACTIVE 위주, email/name 중복 없음)
      const extraUsersA = await Promise.all(
        Array.from({ length: 48 }, (_, i) =>
          tx.user.create({
            data: {
              id: randomUUID(),
              companyId: companyA.id,
              name: koreanNames[i],
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

      // ---------- Invitations (회사당 300) ----------
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
      ];

      const inviteCountA = invitationData.filter(
        (row) => row.companyId === companyA.id,
      ).length;
      const inviteCountB = invitationData.filter(
        (row) => row.companyId === companyB.id,
      ).length;

      for (let i = inviteCountA; i < INVITATIONS_PER_COMPANY; i++) {
        invitationData.push({
          companyId: companyA.id,
          name: `추가초대A${i + 1}`,
          email: `invitee-a-${i + 1}@snackfactory.com`,
          role: i % 5 === 0 ? InvitationRole.ADMIN : InvitationRole.USER,
          tokenHash: hashToken(`invite-token-a-extra-${i + 1}`),
          expiresAt: daysFromNow(1 + (i % 20)),
          isUsed: i % 7 === 0,
        });
      }

      for (let i = inviteCountB; i < INVITATIONS_PER_COMPANY; i++) {
        invitationData.push({
          companyId: companyB.id,
          name: `추가초대B${i + 1}`,
          email: `invitee-b-${i + 1}@officebite.com`,
          role: i % 5 === 0 ? InvitationRole.ADMIN : InvitationRole.USER,
          tokenHash: hashToken(`invite-token-b-extra-${i + 1}`),
          expiresAt: daysFromNow(1 + (i % 20)),
          isUsed: i % 7 === 0,
        });
      }

      for (const batch of chunkArray(invitationData, CREATE_MANY_CHUNK)) {
        await tx.invitation.createMany({ data: batch });
      }
      counts.invitations = invitationData.length;

      // ---------- Categories (depth 1 상위 / depth 2 하위, 고정 UUID) ----------
      // 숫자 id → UUID: 상위 N → ...00000N, 하위 N → ...0001NN
      const parentCategoryId = (id: number) =>
        `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
      const childCategoryId = (id: number) =>
        `00000000-0000-4000-8000-0000000001${String(id).padStart(2, "0")}`;

      const parentCategoryDefs = [
        { id: 1, name: "스낵" },
        { id: 2, name: "음료" },
        { id: 3, name: "생수" },
        { id: 4, name: "간편식" },
        { id: 5, name: "신선식품" },
        { id: 6, name: "비품" },
      ] as const;

      const childCategoryDefs = [
        { id: 1, name: "과자", parentId: 1 },
        { id: 2, name: "쿠키", parentId: 1 },
        { id: 3, name: "파이", parentId: 1 },
        { id: 4, name: "초콜릿류", parentId: 1 },
        { id: 5, name: "캔디류", parentId: 1 },
        { id: 6, name: "껌류", parentId: 1 },
        { id: 7, name: "비스켓류", parentId: 1 },
        { id: 8, name: "씨리얼바", parentId: 1 },
        { id: 9, name: "젤리류", parentId: 1 },
        { id: 10, name: "견과류", parentId: 1 },
        { id: 11, name: "워터젤리", parentId: 1 },
        { id: 12, name: "청량/탄산음료", parentId: 2 },
        { id: 13, name: "과즙음료", parentId: 2 },
        { id: 14, name: "에너지음료", parentId: 2 },
        { id: 15, name: "이온음료", parentId: 2 },
        { id: 16, name: "유산균음료", parentId: 2 },
        { id: 17, name: "건강음료", parentId: 2 },
        { id: 18, name: "차류", parentId: 2 },
        { id: 19, name: "두유/우유", parentId: 2 },
        { id: 20, name: "커피", parentId: 2 },
        { id: 21, name: "생수", parentId: 3 },
        { id: 22, name: "스파클링", parentId: 3 },
        { id: 23, name: "봉지라면", parentId: 4 },
        { id: 24, name: "과일", parentId: 4 },
        { id: 25, name: "컵라면", parentId: 4 },
        { id: 26, name: "핫도그 및 소시지", parentId: 4 },
        { id: 27, name: "계란", parentId: 4 },
        { id: 28, name: "죽/스프류", parentId: 4 },
        { id: 29, name: "컵밥류", parentId: 4 },
        { id: 30, name: "시리얼", parentId: 4 },
        { id: 31, name: "반찬류", parentId: 4 },
        { id: 32, name: "면류", parentId: 4 },
        { id: 33, name: "요거트류", parentId: 4 },
        { id: 34, name: "가공안주류", parentId: 4 },
        { id: 35, name: "유제품", parentId: 4 },
        { id: 36, name: "샐러드", parentId: 5 },
        { id: 37, name: "빵", parentId: 5 },
        { id: 38, name: "햄버거/샌드위치", parentId: 5 },
        { id: 39, name: "주먹밥/김밥", parentId: 5 },
        { id: 40, name: "도시락", parentId: 5 },
        { id: 41, name: "커피/차류", parentId: 6 },
        { id: 42, name: "생활용품", parentId: 6 },
        { id: 43, name: "일회용품", parentId: 6 },
        { id: 44, name: "사무용품", parentId: 6 },
      ] as const;

      await Promise.all(
        parentCategoryDefs.map((def) =>
          tx.category.create({
            data: {
              id: parentCategoryId(def.id),
              name: def.name,
              depth: 1,
            },
          }),
        ),
      );

      const childCategories = await Promise.all(
        childCategoryDefs.map((def) =>
          tx.category.create({
            data: {
              id: childCategoryId(def.id),
              parentId: parentCategoryId(def.parentId),
              name: def.name,
              depth: 2,
            },
          }),
        ),
      );

      const categoryByName = Object.fromEntries(
        childCategories.map((category) => [category.name, category]),
      ) as Record<(typeof childCategoryDefs)[number]["name"], (typeof childCategories)[number]>;

      const catSnack = categoryByName["과자"];
      const catCookie = categoryByName["쿠키"];
      const catPie = categoryByName["파이"];
      const catBiscuit = categoryByName["비스켓류"];
      const catJelly = categoryByName["젤리류"];
      const catCoffee = categoryByName["커피"];
      const catSoda = categoryByName["청량/탄산음료"];
      const catBagRamen = categoryByName["봉지라면"];
      const catCupMeal = categoryByName["컵밥류"];

      const leafCategories = childCategories.map((cat) => ({
        cat,
        name: cat.name,
      }));

      counts.categories =
        parentCategoryDefs.length + childCategoryDefs.length;

      // ---------- Products (스낵팩토리 32+ / 오피스바이트 16+ / 기타 회사 소량) ----------
      const namedProductDefsA = [
        {
          categoryId: catSnack.id,
          categoryName: catSnack.name,
          createdById: adminA.id,
          name: "포카칩 오리지널",
          price: 1500,
          stock: 120,
          purchaseCount: 45,
          imageUrl: seedProductImageUrl("pocachip"),
          productUrl: "https://example.com/products/pocachip",
        },
        {
          categoryId: catSnack.id,
          categoryName: catSnack.name,
          createdById: adminA.id,
          name: "허니버터칩",
          price: 1800,
          stock: 80,
          purchaseCount: 62,
          imageUrl: seedProductImageUrl("honeybutter"),
          productUrl: "https://example.com/products/honeybutter",
        },
        {
          categoryId: catPie.id,
          categoryName: catPie.name,
          createdById: adminA.id,
          name: "초코파이",
          price: 4000,
          stock: 60,
          purchaseCount: 30,
          imageUrl: seedProductImageUrl("chocopie"),
          productUrl: "https://example.com/products/chocopie",
        },
        {
          categoryId: catBiscuit.id,
          categoryName: catBiscuit.name,
          createdById: superAdminA.id,
          name: "오리온 고소미",
          price: 2500,
          stock: 90,
          purchaseCount: 22,
          imageUrl: seedProductImageUrl("gosomi"),
          productUrl: "https://example.com/products/gosomi",
        },
        {
          categoryId: catJelly.id,
          categoryName: catJelly.name,
          createdById: adminA.id,
          name: "마이구미 포도",
          price: 1200,
          stock: 150,
          purchaseCount: 55,
          imageUrl: seedProductImageUrl("mygummi"),
          productUrl: "https://example.com/products/mygummi",
        },
        {
          categoryId: catCoffee.id,
          categoryName: catCoffee.name,
          createdById: adminA.id,
          name: "칸타타 아메리카노",
          price: 2200,
          stock: 100,
          purchaseCount: 70,
          imageUrl: seedProductImageUrl("cantata"),
          productUrl: "https://example.com/products/cantata",
        },
        {
          categoryId: catCoffee.id,
          categoryName: catCoffee.name,
          createdById: adminA.id,
          name: "맥심 모카골드",
          price: 8000,
          stock: 40,
          purchaseCount: 18,
          imageUrl: seedProductImageUrl("maxim"),
          productUrl: "https://example.com/products/maxim",
        },
        {
          categoryId: catSoda.id,
          categoryName: catSoda.name,
          createdById: adminA.id,
          name: "코카콜라 355ml",
          price: 1600,
          stock: 200,
          purchaseCount: 88,
          imageUrl: seedProductImageUrl("coke"),
          productUrl: "https://example.com/products/coke",
        },
        {
          categoryId: catBagRamen.id,
          categoryName: catBagRamen.name,
          createdById: adminA.id,
          name: "신라면",
          price: 1100,
          stock: 180,
          purchaseCount: 95,
          imageUrl: seedProductImageUrl("shinramen"),
          productUrl: "https://example.com/products/shinramen",
        },
        {
          categoryId: catCupMeal.id,
          categoryName: catCupMeal.name,
          createdById: adminA.id,
          name: "햇반 210g",
          price: 1900,
          stock: 70,
          purchaseCount: 40,
          imageUrl: seedProductImageUrl("hetbahn"),
          productUrl: "https://example.com/products/hetbahn",
        },
      ];

      // 카테고리별 자연스러운 상품명 (페이지네이션 채우기용)
      const productNamesByCategory: Record<string, string[]> = {
        과자: [
          "새우깡",
          "양파링",
          "치토스",
          "프링글스 오리지널",
          "꼬깔콘 고소한맛",
          "오징어땅콩",
          "바나나킥",
          "썬칩",
          "구운양파",
          "카라멜콘",
          "꼬북칩 초코츄러스",
          "허니버터아몬드",
        ],
        쿠키: [
          "오레오",
          "초코칩쿠키",
          "버터쿠키",
          "마카다미아쿠키",
          "화이트쿠키",
          "딸기샌드쿠키",
          "카스타드쿠키",
          "시나몬쿠키",
          "아몬드쿠키",
          "민트초코쿠키",
          "홈런볼 초코",
          "다이제 초코",
        ],
        파이: [
          "몽쉘 크림",
          "카스타드",
          "후렌치파이 딸기",
          "오뜨 쇼콜라",
          "파이만주",
          "초코롤케이크",
          "크림파이",
          "애플파이",
          "바나나파이",
          "치즈파이",
          "소프트케익",
          "가나슈파이",
        ],
        초콜릿류: [
          "빼빼로 아몬드",
          "가나 마일드",
          "트윅스",
          "스니커즈",
          "킷캣",
          "자유시간",
          "크런키",
          "허쉬 다크",
          "몰티져스",
          "초코바 카라멜",
          "다크초콜릿 70%",
          "밀크초콜릿바",
        ],
        캔디류: [
          "멘토스 믹스",
          "츄파춥스",
          "청포도캔디",
          "박하사탕",
          "레몬캔디",
          "커피캔디",
          "과일사탕 믹스",
          "밀크캔디",
          "허브캔디",
          "딸기캔디",
          "콜라향 캔디",
          "요거트캔디",
        ],
        껌류: [
          "자일리톨 껌",
          "스피아민트 껌",
          "과일믹스 껌",
          "페퍼민트 껌",
          "무설탕 껌",
          "풍선껌",
          "쿨민트 껌",
          "스트립 껌",
          "커피향 껌",
          "애플민트 껌",
          "시나몬 껌",
          "워터멜론 껌",
        ],
        비스켓류: [
          "참크래커",
          "버터비스킷",
          "야채크래커",
          "치즈비스킷",
          "통밀비스킷",
          "마늘빵 스낵",
          "베이컨스낵",
          "고소한 전병",
          "김스낵",
          "쌀과자",
          "옥수수비스킷",
          "감자비스킷",
        ],
        씨리얼바: [
          "켈로그 바",
          "에너지바 초코",
          "그래놀라바",
          "아몬드바",
          "크랜베리바",
          "피넛버터바",
          "프로틴바 쿠키앤크림",
          "오트바",
          "과일견과바",
          "요거트코팅바",
          "코코넛바",
          "헤이즐넛바",
        ],
        젤리류: [
          "하리보 골드베렌",
          "마이구미 복숭아",
          "왕꿈틀이",
          "젤리빈 믹스",
          "푸딩젤리",
          "포도젤리",
          "복숭아젤리",
          "요구르트젤리",
          "콜라겐젤리",
          "슬라이스젤리",
          "미니젤리팩",
          "과일컵젤리",
        ],
        견과류: [
          "아몬드믹스",
          "하루견과",
          "캐슈넛",
          "피스타치오",
          "호두슬라이스",
          "마카다미아",
          "볶음땅콩",
          "믹스너트",
          "호박씨",
          "해바라기씨",
          "아몬드&크랜베리",
          "저염 견과",
        ],
        워터젤리: [
          "곤약젤리 포도",
          "곤약젤리 복숭아",
          "워터젤리 사과",
          "제로슈거 젤리",
          "알로에워터젤리",
          "망고워터젤리",
          "자몽워터젤리",
          "레몬워터젤리",
          "청포도워터젤리",
          "딸기워터젤리",
          "파인애플워터젤리",
          "오렌지워터젤리",
        ],
        "청량/탄산음료": [
          "펩시 355ml",
          "칠성사이다 355ml",
          "환타오렌지 355ml",
          "마운틴듀",
          "밀키스",
          "천연사이다",
          "콜라 제로",
          "사이다 제로",
          "포도환타",
          "레몬사이다",
          "크림소다",
          "진저에일",
        ],
        과즙음료: [
          "오렌지주스",
          "사과주스",
          "포도주스",
          "토마토주스",
          "망고주스",
          "자몽주스",
          "딸기바나나주스",
          "알로에주스",
          "혼합과일주스",
          "당근사과주스",
          "파인애플주스",
          "석류주스",
        ],
        에너지음료: [
          "레드불",
          "몬스터 에너지",
          "핫식스",
          "박카스",
          "비타파워",
          "에너지부스트",
          "카페인샷",
          "구연산 에너지",
          "제로 에너지",
          "시트러스 에너지",
          "베리 에너지",
          "스포츠에너지",
        ],
        이온음료: [
          "포카리스웨트",
          "게토레이",
          "파워에이드",
          "토레타",
          "이온더핏",
          "아쿠아리우스",
          "비타민이온",
          "레몬이온",
          "자몽이온",
          "제로이온",
          "스포츠드링크",
          "리커버리워터",
        ],
        유산균음료: [
          "야쿠르트",
          "불가리스",
          "윌",
          "엔요",
          "비피더스",
          "프로바이오틱스드링크",
          "요거트스무디",
          "딸기유산균",
          "플레인유산균",
          "저당유산균",
          "키즈유산균",
          "장건강드링크",
        ],
        건강음료: [
          "비타500",
          "홍삼음료",
          "헛개차",
          "컨디션",
          "비타민C 드링크",
          "콜라겐음료",
          "알로에겔",
          "매실음료",
          "배도라지",
          "생강차음료",
          "레몬디톡스",
          "케일주스",
        ],
        차류: [
          "보리차",
          "녹차",
          "둥글레차",
          "옥수수수염차",
          "우롱차",
          "홍차 밀크티",
          "자스민티",
          "페퍼민트티",
          "캐모마일티",
          "아이스티 복숭아",
          "레몬아이스티",
          "제로아이스티",
        ],
        "두유/우유": [
          "서울우유 200ml",
          "매일우유",
          "바나나우유",
          "초코우유",
          "딸기우유",
          "저지방우유",
          "두유 검은콩",
          "고칼슘두유",
          "아몬드브리즈",
          "귀리우유",
          "코코넛밀크",
          "멸균우유",
        ],
        커피: [
          "레쓰비",
          "카페라떼캔",
          "티오피 마일드",
          "조지아 오리지널",
          "바리스타룰스",
          "콜드브루",
          "아메리카노 캔",
          "바닐라라떼",
          "모카라떼",
          "디카페인 커피",
          "헤이즐넛커피",
          "돌체라떼",
        ],
        생수: [
          "삼다수 500ml",
          "아이시스 500ml",
          "백산수",
          "에비앙",
          "볼빅",
          "평창수",
          "석수",
          "풀무원샘물",
          "스파클생수",
          "지리산수",
          "해양심층수",
          "미네랄워터",
        ],
        스파클링: [
          "트레비 레몬",
          "씨그램 라임",
          "페리에",
          "산펠레그리노",
          "톡사이다",
          "플레인 스파클링",
          "자몽 스파클링",
          "사과 스파클링",
          "복숭아 스파클링",
          "제로 스파클링",
          "탄산수 라임",
          "탄산수 플레인",
        ],
        봉지라면: [
          "진라면 순한맛",
          "너구리",
          "짜파게티",
          "비빔면",
          "참깨라면",
          "안성탕면",
          "삼양라면",
          "열라면",
          "육개장사발면 봉지",
          "꼬꼬면",
          "짜왕",
          "틈새라면",
        ],
        과일: [
          "사과 소팩",
          "바나나 한송이",
          "귤 소포장",
          "포도팩",
          "딸기팩",
          "블루베리컵",
          "키위팩",
          "오렌지망",
          "토마토팩",
          "컷팅과일믹스",
          "과일컵 혼합",
          "건포도팩",
        ],
        컵라면: [
          "육개장사발면",
          "컵누들",
          "신라면컵",
          "짜파게티컵",
          "팔도비빔면컵",
          "참깨라면컵",
          "튀김우동컵",
          "김치사발면",
          "왕뚜껑",
          "진라면컵",
          "오뚜기컵밥라면",
          "짜장컵",
        ],
        "핫도그 및 소시지": [
          "크리스피핫도그",
          "치즈핫도그",
          "프랑크소시지",
          "비엔나소시지",
          "마늘프랑크",
          "훈제소시지",
          "떡핫도그",
          "모짜렐라핫도그",
          "치킨핫도그",
          "캠핑소시지",
          "비엔나팩",
          "스모크소시지",
        ],
        계란: [
          "구운계란 2입",
          "훈제란",
          "맥반석계란",
          "반숙란",
          "염계란",
          "계란장조림팩",
          "흰자계란",
          "유기농란 4입",
          "특란 10입",
          "왕란팩",
          "무항생제란",
          "계란샌드재료팩",
        ],
        "죽/스프류": [
          "전복죽",
          "단호박죽",
          "소고기죽",
          "야채스프",
          "옥수수스프",
          "크림스프",
          "된장국 즉석",
          "미역국 즉석",
          "북어국",
          "호박죽",
          "닭죽",
          "버섯스프",
        ],
        컵밥류: [
          "컵밥 김치",
          "컵밥 치킨",
          "컵밥 제육",
          "컵밥 나물비빔",
          "컵밥 불닭",
          "즉석된장국밥",
          "카레컵밥",
          "짜장컵밥",
          "비빔컵밥",
          "참치마요컵밥",
          "스팸컵밥",
          "오므라이스컵",
        ],
        시리얼: [
          "콘푸로스트",
          "첵스초코",
          "후루트링",
          "아몬드푸레이크",
          "그래놀라",
          "오트밀",
          "코코볼",
          "허니첵스",
          "시리얼바이트",
          "통곡물시리얼",
          "프로틴시리얼",
          "딸기시리얼",
        ],
        반찬류: [
          "김치볶음",
          "멸치볶음",
          "시금치나물",
          "콩자반",
          "어묵볶음",
          "계란말이",
          "잡채",
          "도라지무침",
          "오이무침",
          "장조림",
          "깻잎장아찌",
          "두부조림",
        ],
        면류: [
          "소면",
          "우동면",
          "스파게티면",
          "쌀국수",
          "냉면사리",
          "칼국수면",
          "쫄면",
          "당면",
          "페투치네",
          "라자냐면",
          "메밀소바",
          "비빔국수면",
        ],
        요거트류: [
          "그릭요거트",
          "딸기요거트",
          "블루베리요거트",
          "플레인요거트",
          "드링킹요거트",
          "제로슈거요거트",
          "프로바이오틱스요거트",
          "복숭아요거트",
          "망고요거트",
          "요거트파르페",
          "떠먹는요거트",
          "키즈요거트",
        ],
        가공안주류: [
          "육포",
          "오징어채",
          "쥐포",
          "버터구이오징어",
          "꿀버터아몬드안주",
          "치즈큐브안주",
          "소시지스낵",
          "버터프레첼",
          "맥주안주믹스",
          "건조문어",
          "화살오징어",
          "스모크치즈",
        ],
        유제품: [
          "모짜렐라치즈",
          "체다슬라이스",
          "버터",
          "생크림",
          "크림치즈",
          "파마산가루",
          "스트링치즈",
          "요거트치즈",
          "슬라이스치즈",
          "저지방치즈",
          "우유팩 1L",
          "연유",
        ],
        샐러드: [
          "치킨샐러드",
          "리코타샐러드",
          "콥샐러드",
          "연어샐러드",
          "시저샐러드",
          "과일샐러드",
          "그린샐러드",
          "퀴노아샐러드",
          "두부샐러드",
          "계란샐러드",
          "참치샐러드",
          "베지샐러드",
        ],
        빵: [
          "식빵",
          "크로와상",
          "베이글",
          "단팥빵",
          "소보루빵",
          "마늘빵",
          "치아바타",
          "모닝빵",
          "버터롤",
          "소시지빵",
          "피자빵",
          "옥수수빵",
        ],
        "햄버거/샌드위치": [
          "불고기버거",
          "치킨버거",
          "에그샌드위치",
          "참치샌드위치",
          "햄치즈샌드",
          "클럽샌드위치",
          "베이컨샌드",
          "야채샌드",
          "쉬림프버거",
          "더블치즈버거",
          "치킨마요샌드",
          "BLT샌드위치",
        ],
        "주먹밥/김밥": [
          "참치마요주먹밥",
          "김치주먹밥",
          "불고기주먹밥",
          "삼각김밥 참치",
          "삼각김밥 고추장",
          "김밥 기본",
          "치즈김밥",
          "소고기김밥",
          "야채김밥",
          "날치알주먹밥",
          "스팸주먹밥",
          "계란김밥",
        ],
        도시락: [
          "불고기도시락",
          "제육도시락",
          "치킨마요도시락",
          "생선구이도시락",
          "비빔도시락",
          "카레도시락",
          "돈까스도시락",
          "샐러드도시락",
          "잡채도시락",
          "소시지도시락",
          "덮밥도시락",
          "건강도시락",
        ],
        "커피/차류": [
          "맥심 모카골드 리필",
          "카누 미니",
          "녹차티백",
          "홍차티백",
          "둥글레차티백",
          "원두커피 분쇄",
          "드립백커피",
          "코코아믹스",
          "밀크티믹스",
          "허브티세트",
          "디카페인 원두",
          "아이스티믹스",
        ],
        생활용품: [
          "물티슈",
          "핸드워시",
          "주방세제",
          "쓰레기봉투",
          "세탁세제",
          "섬유유연제",
          "방향제",
          "청소용 걸레",
          "수세미",
          "고무장갑",
          "휴지 3겹",
          "손소독제",
        ],
        일회용품: [
          "종이컵 50입",
          "플라스틱컵",
          "일회용 수저세트",
          "종이접시",
          "빨대",
          "비닐장갑",
          "랩",
          "호일",
          "지퍼백",
          "일회용 젓가락",
          "도시락용기",
          "테이크아웃홀더",
        ],
        사무용품: [
          "볼펜 12색",
          "형광펜세트",
          "포스트잇",
          "A4 복사용지",
          "스테이플러",
          "테이프",
          "가위",
          "클립",
          "파일철",
          "메모패드",
          "지우개",
          "바인더",
        ],
      };

      const pickCategoryProductName = (
        categoryName: string,
        usedNames: Set<string>,
        index: number,
      ) => {
        const pool = productNamesByCategory[categoryName] ?? [];
        const available = pool.filter((name) => !usedNames.has(name));
        if (available.length > 0) {
          return available[index % available.length];
        }
        const base = pool[index % Math.max(pool.length, 1)] ?? categoryName;
        let n = index + 1;
        let candidate = `${base} ${n}`;
        while (usedNames.has(candidate)) {
          n += 1;
          candidate = `${base} ${n}`;
        }
        return candidate;
      };

      type ProductDef = {
        id: string;
        companyId: string;
        categoryId: string;
        categoryName: string;
        createdById: string;
        name: string;
        price: number;
        stock: number;
        purchaseCount: number;
        imageUrl: string;
        productUrl: string;
      };

      const padProductsToTarget = (
        defs: Omit<ProductDef, "id" | "companyId">[],
        companyId: string,
        creatorIds: string[],
        usedNames: Set<string>,
        prefix: string,
      ): ProductDef[] => {
        const result: ProductDef[] = defs.map((def) => ({
          id: randomUUID(),
          companyId,
          ...def,
        }));
        let i = 0;
        while (result.length < PRODUCTS_PER_COMPANY) {
          const leaf = leafCategories[i % leafCategories.length];
          const name = pickCategoryProductName(leaf.name, usedNames, i);
          usedNames.add(name);
          const n = result.length + 1;
          result.push({
            id: randomUUID(),
            companyId,
            categoryId: leaf.cat.id,
            categoryName: leaf.name,
            createdById: creatorIds[i % creatorIds.length],
            name,
            price: 900 + (i % 25) * 150,
            stock: 10 + (i % 20) * 8,
            purchaseCount: i % 60,
            imageUrl: seedProductImageUrl(`${prefix}-${n}`),
            productUrl: `https://example.com/products/${prefix}-${n}`,
          });
          i += 1;
        }
        return result;
      };

      // 하위 카테고리마다 기본 상품을 채운 뒤, 회사당 500개로 패딩
      const PRODUCTS_PER_CATEGORY_A = 10;
      const usedProductNamesA = new Set(
        namedProductDefsA.map((def) => def.name),
      );
      const countByCategoryA = new Map<string, number>();
      for (const def of namedProductDefsA) {
        countByCategoryA.set(
          def.categoryId,
          (countByCategoryA.get(def.categoryId) ?? 0) + 1,
        );
      }

      const paddingDefsA = leafCategories.flatMap((leaf, leafIndex) => {
        const current = countByCategoryA.get(leaf.cat.id) ?? 0;
        const need = Math.max(0, PRODUCTS_PER_CATEGORY_A - current);
        return Array.from({ length: need }, (_, i) => {
          const name = pickCategoryProductName(
            leaf.name,
            usedProductNamesA,
            i,
          );
          usedProductNamesA.add(name);
          const n = current + i + 1;
          return {
            categoryId: leaf.cat.id,
            categoryName: leaf.name,
            createdById:
              (leafIndex + i) % 3 === 0 ? superAdminA.id : adminA.id,
            name,
            price: 1000 + ((leafIndex + i) % 20) * 200,
            stock: 20 + ((leafIndex + i) % 15) * 10,
            purchaseCount: (leafIndex + i) % 40,
            imageUrl: seedProductImageUrl(`product-a-${leafIndex + 1}-${n}`),
            productUrl: `https://example.com/products/product-a-${leafIndex + 1}-${n}`,
          };
        });
      });

      const productDefsA = padProductsToTarget(
        [...namedProductDefsA, ...paddingDefsA],
        companyA.id,
        [adminA.id, superAdminA.id],
        usedProductNamesA,
        "product-a",
      );

      const namedProductDefsB = [
        {
          categoryId: catSnack.id,
          categoryName: catSnack.name,
          createdById: adminB.id,
          name: "새우깡",
          price: 1400,
          stock: 110,
          purchaseCount: 33,
          imageUrl: seedProductImageUrl("saeukkang"),
          productUrl: "https://example.com/products/saeukkang",
        },
        {
          categoryId: catCookie.id,
          categoryName: catCookie.name,
          createdById: adminB.id,
          name: "홈런볼 초코",
          price: 2800,
          stock: 50,
          purchaseCount: 27,
          imageUrl: seedProductImageUrl("homerunball"),
          productUrl: "https://example.com/products/homerunball",
        },
        {
          categoryId: catCoffee.id,
          categoryName: catCoffee.name,
          createdById: superAdminB.id,
          name: "스타벅스 더블샷",
          price: 2900,
          stock: 65,
          purchaseCount: 41,
          imageUrl: seedProductImageUrl("doubleshot"),
          productUrl: "https://example.com/products/doubleshot",
        },
        {
          categoryId: catSoda.id,
          categoryName: catSoda.name,
          createdById: adminB.id,
          name: "스프라이트 355ml",
          price: 1500,
          stock: 90,
          purchaseCount: 20,
          imageUrl: seedProductImageUrl("sprite"),
          productUrl: "https://example.com/products/sprite",
        },
        {
          categoryId: catBagRamen.id,
          categoryName: catBagRamen.name,
          createdById: adminB.id,
          name: "진라면 매운맛",
          price: 1000,
          stock: 140,
          purchaseCount: 50,
          imageUrl: seedProductImageUrl("jinramen"),
          productUrl: "https://example.com/products/jinramen",
        },
        {
          categoryId: catCupMeal.id,
          categoryName: catCupMeal.name,
          createdById: adminB.id,
          name: "컵밥 불고기",
          price: 3500,
          stock: 35,
          purchaseCount: 15,
          imageUrl: seedProductImageUrl("cupbap"),
          productUrl: "https://example.com/products/cupbap",
        },
      ];

      const usedProductNamesB = new Set(
        namedProductDefsB.map((def) => def.name),
      );
      const generatedDefsB = Array.from({ length: 26 }, (_, i) => {
        const leaf = leafCategories[(i + 3) % leafCategories.length];
        const name = pickCategoryProductName(
          leaf.name,
          usedProductNamesB,
          i,
        );
        usedProductNamesB.add(name);
        return {
          categoryId: leaf.cat.id,
          categoryName: leaf.name,
          createdById: i % 4 === 0 ? superAdminB.id : adminB.id,
          name,
          price: 900 + (i % 18) * 150,
          stock: 15 + (i % 12) * 8,
          purchaseCount: (i * 3) % 50,
          imageUrl: seedProductImageUrl(`product-b-${i + 1}`),
          productUrl: `https://example.com/products/product-b-${i + 1}`,
        };
      });

      const productDefsB = padProductsToTarget(
        [...namedProductDefsB, ...generatedDefsB],
        companyB.id,
        [adminB.id, superAdminB.id],
        usedProductNamesB,
        "product-b",
      );

      // 기타 회사: 회사당 500개
      const productDefsExtra = extraCompanies.flatMap((company, index) => {
        const creator = extraCompanyUsers[index * 2]; // SUPER_ADMIN
        const staff = extraCompanyUsers[index * 2 + 1];
        const usedNames = new Set<string>();
        const leaf = leafCategories[index % leafCategories.length];
        const name = pickCategoryProductName(leaf.name, usedNames, 0);
        usedNames.add(name);
        return padProductsToTarget(
          [
            {
              categoryId: leaf.cat.id,
              categoryName: leaf.name,
              createdById: creator.id,
              name,
              price: 1500 + (index % 10) * 100,
              stock: 30 + index,
              purchaseCount: index % 20,
              imageUrl: seedProductImageUrl(`product-c-${index + 1}-1`),
              productUrl: `https://example.com/products/product-c-${index + 1}-1`,
            },
          ],
          company.id,
          [creator.id, staff.id],
          usedNames,
          `product-c-${index + 1}`,
        );
      });

      const allProductDefs: ProductDef[] = [
        ...productDefsA,
        ...productDefsB,
        ...productDefsExtra,
      ];

      for (const batch of chunkArray(
        allProductDefs.map(({ categoryName: _categoryName, ...data }) => data),
        CREATE_MANY_CHUNK,
      )) {
        await tx.product.createMany({ data: batch });
      }

      const productMeta: ProductMeta[] = allProductDefs.map((def) => ({
        product: {
          id: def.id,
          companyId: def.companyId,
          name: def.name,
          price: def.price,
          imageUrl: def.imageUrl,
        },
        categoryName: def.categoryName,
      }));

      const productsByCompanyId = new Map<string, ProductMeta[]>();
      for (const meta of productMeta) {
        const list = productsByCompanyId.get(meta.product.companyId) ?? [];
        list.push(meta);
        productsByCompanyId.set(meta.product.companyId, list);
      }

      const productsA = productsByCompanyId.get(companyA.id) ?? [];
      const productsB = productsByCompanyId.get(companyB.id) ?? [];
      counts.products = allProductDefs.length;

      for (const company of companies) {
        const companyProductCount =
          productsByCompanyId.get(company.id)?.length ?? 0;
        if (companyProductCount !== PRODUCTS_PER_COMPANY) {
          throw new Error(
            `Seed aborted: ${company.name} products=${companyProductCount}, expected ${PRODUCTS_PER_COMPANY}`,
          );
        }
      }

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

      // 기타 회사: 최근 12개월
      for (const [index, company] of extraCompanies.entries()) {
        for (let m = 0; m < 12; m++) {
          budgetRows.push({
            id: randomUUID(),
            companyId: company.id,
            yearMonth: yearMonthOffset(m),
            amount:
              company.defaultMonthlyBudget +
              (index % 3) * 5000 -
              (m % 4) * 3000,
          });
        }
      }

      for (const batch of chunkArray(budgetRows, CREATE_MANY_CHUNK)) {
        await tx.budget.createMany({ data: batch });
      }
      counts.budgets = budgetRows.length;

      // ---------- Orders + OrderItems (회사당 300) ----------
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

      const usersBActive = usersB.filter(
        (u) => u.status === UserStatus.ACTIVE,
      );

      type OrderSeedContext = {
        companyId: string;
        products: ProductMeta[];
        requesters: Array<{ id: string }>;
        processorId: string;
        directBuyerId: string;
        preferRequesterId?: string;
      };

      const orderContexts: OrderSeedContext[] = [
        {
          companyId: companyA.id,
          products: productsA,
          requesters: requestersA,
          processorId: adminA.id,
          directBuyerId: adminA.id,
          preferRequesterId: userA1.id,
        },
        {
          companyId: companyB.id,
          products: productsB,
          requesters: usersBActive,
          processorId: adminB.id,
          directBuyerId: adminB.id,
          preferRequesterId: userB1.id,
        },
        ...extraCompanies.map((company, index) => {
          const superAdmin = extraCompanyUsers[index * 2];
          const staff = extraCompanyUsers[index * 2 + 1];
          return {
            companyId: company.id,
            products: productsByCompanyId.get(company.id) ?? [],
            requesters: [staff, superAdmin],
            processorId: superAdmin.id,
            directBuyerId: superAdmin.id,
            preferRequesterId: staff.id,
          };
        }),
      ];

      const orderRows: Array<{
        id: string;
        companyId: string;
        requesterId: string;
        processorId: string | null;
        type: OrderType;
        status: OrderStatus;
        productAmount: number;
        shippingFee: number;
        totalPrice: number;
        requestMessage: string | null;
        responseMessage: string | null;
        approvedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }> = [];

      const orderItemRows: Array<{
        id: string;
        orderId: string;
        productId: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
        productName: string;
        imageUrl: string | null;
        categoryName: string;
        createdAt: Date;
      }> = [];

      for (const ctx of orderContexts) {
        if (ctx.products.length === 0 || ctx.requesters.length === 0) {
          throw new Error(
            `Seed aborted: missing products/requesters for company ${ctx.companyId}`,
          );
        }

        for (let i = 0; i < ORDERS_PER_COMPANY; i++) {
          const status = statusesCycle[i % statusesCycle.length];
          const isDirect = i % 11 === 0;
          const type = isDirect ? OrderType.DIRECT : OrderType.REQUEST;
          const needsProcessor =
            status === OrderStatus.APPROVED ||
            status === OrderStatus.REJECTED ||
            type === OrderType.DIRECT;

          // 앞쪽 일부는 특정 유저 요청으로 채워 페이지네이션 테스트에 활용
          const requester =
            !isDirect && ctx.preferRequesterId && i < 40
              ? { id: ctx.preferRequesterId }
              : (ctx.requesters[i % ctx.requesters.length] ??
                ctx.requesters[0]);

          const itemCount = 1 + (i % 4);
          const items = Array.from({ length: itemCount }, (_, j) => {
            const meta = ctx.products[(i + j * 3) % ctx.products.length];
            return toOrderItem(meta, 1 + ((i + j) % 12));
          });

          const { orderItems, productAmount } = buildOrderItems(items);
          const finalStatus = isDirect ? OrderStatus.APPROVED : status;
          const fee =
            finalStatus === OrderStatus.CANCELLED ||
            finalStatus === OrderStatus.REJECTED
              ? 0
              : shippingFee;
          const createdAt = daysAgo(i % 90);
          const orderId = randomUUID();

          orderRows.push({
            id: orderId,
            companyId: ctx.companyId,
            requesterId: isDirect ? ctx.directBuyerId : requester.id,
            processorId: needsProcessor ? ctx.processorId : null,
            type,
            status: finalStatus,
            productAmount,
            shippingFee: fee,
            totalPrice: productAmount + fee,
            requestMessage: isDirect
              ? null
              : (requestMessages[i % requestMessages.length] ??
                "구매 요청드립니다."),
            responseMessage:
              finalStatus === OrderStatus.APPROVED || isDirect
                ? i % 2 === 0
                  ? "승인되었습니다."
                  : "관리자 직접 구매"
                : finalStatus === OrderStatus.REJECTED
                  ? "이번 달 예산이 부족합니다."
                  : null,
            approvedAt:
              finalStatus === OrderStatus.APPROVED || isDirect
                ? daysAgo(Math.max(0, (i % 20) - 1))
                : null,
            createdAt,
            updatedAt: createdAt,
          });

          for (const item of orderItems) {
            orderItemRows.push({
              id: randomUUID(),
              orderId,
              productId: item.productId,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
              productName: item.productName,
              imageUrl: item.imageUrl,
              categoryName: item.categoryName,
              createdAt,
            });
          }
        }
      }

      for (const batch of chunkArray(orderRows, CREATE_MANY_CHUNK)) {
        await tx.order.createMany({ data: batch });
      }
      for (const batch of chunkArray(orderItemRows, CREATE_MANY_CHUNK)) {
        await tx.orderItem.createMany({ data: batch });
      }
      counts.orders = orderRows.length;
      counts.orderItems = orderItemRows.length;

      for (const ctx of orderContexts) {
        const companyOrderCount = orderRows.filter(
          (row) => row.companyId === ctx.companyId,
        ).length;
        if (companyOrderCount !== ORDERS_PER_COMPANY) {
          throw new Error(
            `Seed aborted: company ${ctx.companyId} orders=${companyOrderCount}, expected ${ORDERS_PER_COMPANY}`,
          );
        }
      }

      // ---------- CartItems (주요 회사 합계 300+) ----------
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

      for (let i = 0; cartRows.length < CART_ITEMS_TARGET; i++) {
        const user = activeUsersA[i % activeUsersA.length];
        const product = productsA[i % productsA.length].product;
        pushCart(user.id, product.id, 1 + (i % 5));
        if (i > PRODUCTS_PER_COMPANY * activeUsersA.length) break;
      }

      for (let i = 0; i < usersBActive.length * 8; i++) {
        const user = usersBActive[i % usersBActive.length];
        pushCart(
          user.id,
          productsB[i % productsB.length].product.id,
          1 + (i % 4),
        );
      }

      for (const batch of chunkArray(cartRows, CREATE_MANY_CHUNK)) {
        await tx.cartItem.createMany({ data: batch });
      }
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
  console.log(`  invitations    : ${counts.invitations} (A/B ${INVITATIONS_PER_COMPANY} each)`);
  console.log(`  categories     : ${counts.categories}`);
  console.log(
    `  products       : ${counts.products} (${PRODUCTS_PER_COMPANY}/company × ${counts.companies})`,
  );
  console.log(`  budgets        : ${counts.budgets}`);
  console.log(
    `  orders         : ${counts.orders} (${ORDERS_PER_COMPANY}/company × ${counts.companies})`,
  );
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
