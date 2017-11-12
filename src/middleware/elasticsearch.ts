export const USER_MAPPING = {
  properties: {
    username: {
      type: 'text',
      index: false,
    },
    password: {
      type: 'text',
      index: false,
    },
    role: {
      type: 'text',
      index: false,
    },
    email: {
      type: 'text',
      index: false,
    },
    firstname: {
      type: 'text',
      index: false,
    },
    lastname: {
      type: 'text',
      index: false,
    },
  },
};

export const CONFIGURATION_MAPPING = {
  properties: {
    key: {
      type: 'text',
      index: false,
    },
    value: {
      type: 'text',
      index: false,
    },
  },
};
