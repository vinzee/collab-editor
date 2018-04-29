// http://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  env: {
    browser: true,
    commonjs: true
  },
  extends: [
    // 'eslint:recommended',
    'eslint:all',

    // 'plugin:vue/base' // - Settings and rules to enable correct ESLint parsing
    // 'plugin:vue/essential' // - Above, plus rules to prevent errors or unintended behavior
    // 'plugin:vue/strongly-recommended' // - Above, plus rules to considerably improve code readability and/or dev experience
    'plugin:vue/recommended' // - Above, plus rules to enforce subjective community defaults to ensure consistency
  ],

  // required to lint *.vue files
  plugins: [
    'vue'
  ],
  // check if imports actually resolve
  'settings': {
    'import/resolver': {
      'webpack': {
        'config': 'build/webpack.base.conf.js'
      }
    }
  },
  // add your custom rules here
  'rules': {
    // don't require .vue extension when importing
    // 'import/extensions': ['error', 'always', {
    //   'js': 'never',
    //   'vue': 'never'
    // }],
    // allow optionalDependencies
    // 'import/no-extraneous-dependencies': ['error', {
    //   'optionalDependencies': ['test/unit/index.js']
    // }],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // make it meaningful
    'prefer-const': 1,
    // keep it simple
    'complexity': [ 1, 5 ],
    'indent': [ 2, 4 ],
    'vue/max-attributes-per-line': 'off',
    'quote-props': ['error', 'as-needed'],
    'quotes': ['error', 'single'],
    'padded-blocks': ['error', { 'classes': 'always', 'blocks': 'never', 'classes': 'never' }],
    'id-length': ['error', { 'exceptions': ['_', 'x', 'y', 'z'] }]
  }
}