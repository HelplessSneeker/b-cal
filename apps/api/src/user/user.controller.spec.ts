import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

jest.mock('generated/prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}));
jest.mock('generated/prisma/browser', () => ({}));

const mockUserService = {
  deleteUser: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('delete', () => {
    it('should delete the user and return success message', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);
      const mockRes = { clearCookie: jest.fn() } as any;

      const result = await controller.delete('user-1', mockRes);

      expect(result).toEqual({ message: 'Successfully deleted user' });
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-1');
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});
