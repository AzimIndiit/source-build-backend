import chalk from 'chalk';
import config from '../config/index.js';

export const displayBanner = (): void => {
  const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║                                                                              ║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('███████╗ ██████╗ ██╗   ██╗██████╗  ██████╗███████╗')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔════╝██╔════╝')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('███████╗██║   ██║██║   ██║██████╔╝██║     █████╗  ')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('╚════██║██║   ██║██║   ██║██╔══██╗██║     ██╔══╝  ')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('███████║╚██████╔╝╚██████╔╝██║  ██║╚██████╗███████╗')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.blueBright('╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('██████╗ ██╗   ██╗██╗██╗     ██████╗ ')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('██╔══██╗██║   ██║██║██║     ██╔══██╗')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('██████╔╝██║   ██║██║██║     ██║  ██║')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('██╔══██╗██║   ██║██║██║     ██║  ██║')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('██████╔╝╚██████╔╝██║███████╗██████╔╝')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.yellow('╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}                                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('██████╗  █████╗  ██████╗██╗  ██╗███████╗███╗   ██╗██████╗ ')}              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔════╝████╗  ██║██╔══██╗')}              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('██████╔╝███████║██║     █████╔╝ █████╗  ██╔██╗ ██║██║  ██║')}              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('██╔══██╗██╔══██║██║     ██╔═██╗ ██╔══╝  ██║╚██╗██║██║  ██║')}              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('██████╔╝██║  ██║╚██████╗██║  ██╗███████╗██║ ╚████║██████╔╝')}              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.bold.greenBright('╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝ ')}              ${chalk.cyan('║')}
${chalk.cyan('║                                                                              ║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════════════════════╝')}
`;

  console.log(banner);
};

export const displayStartupInfo = (port: number): void => {
  const info = `
${chalk.bold.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
  
  ${chalk.bold.green('🚀 Server Status:')} ${chalk.green('RUNNING')}
  ${chalk.bold.cyan('🌍 Environment:')} ${chalk.cyan(config.NODE_ENV)}
  ${chalk.bold.yellow('🔌 Port:')} ${chalk.yellow(port.toString())}
  ${chalk.bold.magenta('📦 Version:')} ${chalk.magenta('1.0.0')}
  ${chalk.bold.blue('🕐 Started:')} ${chalk.blue(new Date().toLocaleString())}
  
  ${chalk.bold.white('📍 Endpoints:')}
  ${chalk.gray('├─')} ${chalk.white('Root:')} ${chalk.underline.blue(`http://localhost:${port}/`)}
  ${chalk.gray('├─')} ${chalk.white('API:')} ${chalk.underline.blue(`http://localhost:${port}/api/v1`)}
  ${chalk.gray('├─')} ${chalk.white('Health:')} ${chalk.underline.blue(`http://localhost:${port}/health`)}
  ${chalk.gray('└─')} ${chalk.white('Docs:')} ${chalk.underline.blue(`http://localhost:${port}/api-docs`)}
  
  ${chalk.bold.green('✨ Server is ready to accept connections!')}
  ${chalk.gray('Press Ctrl+C to stop the server')}
  
${chalk.bold.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
`;

  console.log(info);
};

export const displayShutdownMessage = (): void => {
  const message = `
${chalk.bold.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
  
  ${chalk.bold.red('🛑 Shutting down Source Build Backend...')}
  ${chalk.yellow('👋 Goodbye!')}
  
${chalk.bold.red('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
`;
  console.log(message);
};

// Alternative compact logo
export const displayCompactLogo = (): void => {
  const logo = `
${chalk.bold.cyan('     ██████   ██████  ██    ██ ██████   ██████ ███████ ')}
${chalk.bold.cyan('    ██    ██ ██    ██ ██    ██ ██   ██ ██      ██      ')}
${chalk.bold.cyan('    ██       ██    ██ ██    ██ ██████  ██      █████   ')}
${chalk.bold.cyan('    ██    ██ ██    ██ ██    ██ ██   ██ ██      ██      ')}
${chalk.bold.cyan('     ██████   ██████   ██████  ██   ██  ██████ ███████ ')}
                                                     
${chalk.bold.yellow('    ██████  ██    ██ ██ ██      ██████              ')}
${chalk.bold.yellow('    ██   ██ ██    ██ ██ ██      ██   ██             ')}
${chalk.bold.yellow('    ██████  ██    ██ ██ ██      ██   ██             ')}
${chalk.bold.yellow('    ██   ██ ██    ██ ██ ██      ██   ██             ')}
${chalk.bold.yellow('    ██████   ██████  ██ ███████ ██████              ')}
    
    ${chalk.bold.white('Enterprise E-Commerce Backend')} ${chalk.gray('v1.0.0')}
`;
  console.log(logo);
};

// Animated loading dots
export const showLoadingAnimation = (message: string): NodeJS.Timeout => {
  const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  
  return setInterval(() => {
    process.stdout.write(`\r${chalk.yellow(dots[i])} ${chalk.white(message)}`);
    i = (i + 1) % dots.length;
  }, 100);
};

// Clear loading animation
export const clearLoadingAnimation = (interval: NodeJS.Timeout, successMessage: string): void => {
  clearInterval(interval);
  process.stdout.write(`\r${chalk.green('✓')} ${chalk.white(successMessage)}\n`);
};