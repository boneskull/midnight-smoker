import {defineRule} from 'midnight-smoker/plugin';

const compat = defineRule({
  async check() {
    return undefined;
  },
  name: 'compat',
  description:
    'Ensures types are compatible with various consumer configurations',
});

export default compat;
