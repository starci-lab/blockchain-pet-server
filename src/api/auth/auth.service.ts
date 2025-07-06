import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/api/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { ethers } from 'ethers';
import { JwtService } from '@nestjs/jwt';
import { PetService } from 'src/api/pet/pet.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly petService: PetService,
  ) {
    console.log('AuthService constructor called');
    console.log('jwtService:', this.jwtService);
  }

  async generateMessage() {
    console.log('Generating message for authentication...');
    const message = randomUUID();
    // TODO: set cache message
    return { message };
  }

  async verifySignature(message: string, signature: string, address: string) {
    // const redisKey = `auth-message:${message.toLowerCase()}`;

    // Kiểm tra message còn hợp lệ
    // const validKey = await this.cache.get(redisKey);
    // if (!validKey) {
    //   throw new BadRequestException('Message expired or invalid');
    // }

    // verify chữ ký
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw new BadRequestException('Signature verification failed');
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new BadRequestException('Recovered address does not match');
    }

    // Xóa message sau dùng
    // await this.cache.del(redisKey);

    // Tìm | Tạo mới user
    const normalizedAddress = address.toLowerCase();
    let user = await this.userModel.findOne({
      wallet_address: normalizedAddress,
    });

    if (!user) {
      console.log(
        `🎁 Creating new user with starter pet for: ${normalizedAddress}`,
      );

      user = new this.userModel({
        wallet_address: normalizedAddress,
        last_active_at: new Date(),
      });
      await user.save();
      console.log(`👤 User created successfully: ${normalizedAddress}`);

      // Create starter pet for new user
      try {
        const starterPet = await this.petService.createStarterPet(
          (user._id as Types.ObjectId).toString(),
          normalizedAddress,
        );

        if (starterPet) {
          console.log(
            `✅ New user created with starter pet: ${normalizedAddress} | Pet ID: ${starterPet._id}`,
          );
        }
      } catch (error) {
        console.error(
          `⚠️ User created but starter pet creation failed: ${normalizedAddress}`,
          error,
        );
        // Don't throw error - user creation should still succeed even if pet creation fails
      }
    } else {
      user.last_active_at = new Date();
      await user.save();
      console.log(`🔄 Existing user logged in: ${normalizedAddress}`);
    }

    const { accessToken, refreshToken } = await this.generateAuthCredentials({
      userId: user.wallet_address,
    });
    // TODO: set refresh token to db

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      wallet_address: user.wallet_address,
    };
  }

  async generateAuthCredentials(payload: { userId: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }
}
