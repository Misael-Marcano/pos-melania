import { resolveTenantEmailBranding } from '../../notifications/tenant-email-branding';
import { Tenant } from '../../entities/Tenant.entity';
import { Configuracion } from '../../entities/Configuracion.entity';

jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

const { AppDataSource } = jest.requireMock('../../config/database') as {
  AppDataSource: { getRepository: jest.Mock };
};

describe('resolveTenantEmailBranding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioriza nombreCompania de configuración', async () => {
    AppDataSource.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Tenant) {
        return { findOne: jest.fn().mockResolvedValue({ nombre: 'Tenant SaaS' }) };
      }
      if (entity === Configuracion) {
        return {
          findOne: jest.fn().mockResolvedValue({
            nombreCompania: 'Farmacia Central',
            telefono: '809-555-0100',
            sitioWeb: 'https://farmacia.example',
          }),
        };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    });

    const branding = await resolveTenantEmailBranding(1);
    expect(branding.displayName).toBe('Farmacia Central');
    expect(branding.contactLine).toContain('809-555-0100');
    expect(branding.contactLine).toContain('https://farmacia.example');
  });

  it('usa nombre del tenant si no hay configuración', async () => {
    AppDataSource.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Tenant) {
        return { findOne: jest.fn().mockResolvedValue({ nombre: 'Org Demo' }) };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    });

    const branding = await resolveTenantEmailBranding(2);
    expect(branding.displayName).toBe('Org Demo');
    expect(branding.contactLine).toBeUndefined();
  });
});
