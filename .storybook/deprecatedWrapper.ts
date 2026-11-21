/**
 * Shared Storybook meta for a soft-deprecated orientation wrapper.
 * Stories keep their historic titles so existing snapshot ids stay stable.
 * There is no runtime console.warn; wrappers will be removed in 0.4.0.
 */
export const DEPRECATED_IN = '0.4.0';

export const deprecatedWrapperDescription = (unified: string): string =>
  `Deprecated, use ${unified} with orientation. Will be removed in ${DEPRECATED_IN}.`;

export const deprecatedWrapperStoryMeta = (unified: string) => ({
  tags: ['autodocs', 'deprecated'] as const,
  parameters: {
    docs: {
      description: {
        component: deprecatedWrapperDescription(unified),
      },
    },
  },
});
