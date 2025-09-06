const { execSync } = require('child_process');

console.log('🏗️  Checking build status...');

try {
  // Try to build the project
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!');
  
  // If build succeeds, try to run pre-rendering
  console.log('🎯 Starting pre-render process...');
  execSync('npx react-snap', { stdio: 'inherit' });
  console.log('✅ Pre-rendering completed!');
  
} catch (error) {
  console.error('❌ Build or pre-rendering failed');
  console.log('💡 This is expected if Supabase types are not set up yet.');
  console.log('The pre-rendering will work once the database is properly configured.');
  process.exit(1);
}