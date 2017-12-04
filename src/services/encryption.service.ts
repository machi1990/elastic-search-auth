import * as bcrypt from 'bcrypt';
const SALT_ROUNDS = 16;

export class EncryptionService {
	public static encrypt(text) {
		return bcrypt.hashSync(text, SALT_ROUNDS);
	}

	public static compare(text, encrypted) {
		return bcrypt.compareSync(text, encrypted);
	}
}
