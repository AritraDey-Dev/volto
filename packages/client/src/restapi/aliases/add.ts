import { z } from 'zod';
import { apiRequest, type ApiRequestParams } from '../../API';
import {
  type PloneClientConfig,
  PloneClientConfigSchema,
} from '../../validation/config';
import { createAliasesDataSchema } from '../../validation/aliases';

export const createAliasesArgsSchema = z.object({
  path: z.string(),
  data: createAliasesDataSchema,
  config: PloneClientConfigSchema,
});

export type CreateAliasesArgs = z.infer<typeof createAliasesArgsSchema>;

export const createAliases = async ({
  path,
  data,
  config,
}: CreateAliasesArgs): Promise<undefined> => {
  const validatedArgs = createAliasesArgsSchema.parse({
    path,
    data,
    config,
  });

  const addAliasesPath = `${validatedArgs.path}/@aliases`;

  const options: ApiRequestParams = {
    data: validatedArgs.data,
    config: validatedArgs.config,
  };
  return apiRequest('post', addAliasesPath, options);
};

export const createAliasesMutation = ({
  config,
}: {
  config: PloneClientConfig;
}) => ({
  mutationKey: ['post', 'aliases'],
  mutationFn: ({ path, data }: Omit<CreateAliasesArgs, 'config'>) =>
    createAliases({ path, data, config }),
});
