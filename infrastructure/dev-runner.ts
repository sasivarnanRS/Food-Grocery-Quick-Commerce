import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const isScaled = process.argv.includes('--scaled');

interface ServiceConfig {
  name: string;
  cwd: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  color: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const rootDir = path.resolve(__dirname, '..');

const services: ServiceConfig[] = [
  {
    name: 'GATEWAY    ',
    cwd: path.join(rootDir, 'services', 'api-gateway'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.cyan,
  },
  {
    name: 'USER-SVC   ',
    cwd: path.join(rootDir, 'services', 'user-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.green,
  },
  {
    name: 'PROD-SVC-1 ',
    cwd: path.join(rootDir, 'services', 'product-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    env: { PORT_PRODUCT_SERVICE: '4002', INSTANCE_ID: 'ProductService-4002' },
    color: colors.blue,
  },
  {
    name: 'INVENTORY  ',
    cwd: path.join(rootDir, 'services', 'inventory-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.yellow,
  },
  {
    name: 'CART-SVC   ',
    cwd: path.join(rootDir, 'services', 'cart-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.magenta,
  },
  {
    name: 'ORDER-SVC  ',
    cwd: path.join(rootDir, 'services', 'order-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.red,
  },
  {
    name: 'DELIVERY   ',
    cwd: path.join(rootDir, 'services', 'delivery-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.white,
  },
  {
    name: 'NOTIFY-SVC ',
    cwd: path.join(rootDir, 'services', 'notification-service'),
    command: 'npx',
    args: ['tsx', 'src/index.ts'],
    color: colors.green,
  },
];

if (isScaled) {
  services.push(
    {
      name: 'PROD-SVC-2 ',
      cwd: path.join(rootDir, 'services', 'product-service'),
      command: 'npx',
      args: ['tsx', 'src/index.ts'],
      env: { PORT_PRODUCT_SERVICE: '4012', INSTANCE_ID: 'ProductService-4012' },
      color: colors.blue,
    },
    {
      name: 'PROD-SVC-3 ',
      cwd: path.join(rootDir, 'services', 'product-service'),
      command: 'npx',
      args: ['tsx', 'src/index.ts'],
      env: { PORT_PRODUCT_SERVICE: '4022', INSTANCE_ID: 'ProductService-4022' },
      color: colors.blue,
    }
  );
}

const processes: ChildProcess[] = [];

console.log(`${colors.bright}=== QUICKCOMMERCE MICROSERVICES DEV RUNNER ===${colors.reset}`);
console.log(`Starting ${services.length} services... Mode: ${isScaled ? 'HORIZONTAL SCALED (3 Product Instances)' : 'STANDARD'}\n`);

for (const svc of services) {
  const env = { ...process.env, ...svc.env };
  const child = spawn(svc.command, svc.args, {
    cwd: svc.cwd,
    shell: true,
    env,
  });

  child.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.log(`${svc.color}[${svc.name}]${colors.reset} ${line}`);
    }
  });

  child.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.error(`${svc.color}[${svc.name}:ERR]${colors.reset} ${line}`);
    }
  });

  processes.push(child);
}

process.on('SIGINT', () => {
  console.log('\nShutting down all services gracefully...');
  for (const proc of processes) {
    proc.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const proc of processes) {
    proc.kill();
  }
  process.exit(0);
});
