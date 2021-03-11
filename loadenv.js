// https://github.com/kerimdzhanov/dotenv-flow/issues/11
// NOTE: this file is useful b/c otherwise dotenv-flow would load env from cwd
require('dotenv-flow').config({ path: __dirname });
