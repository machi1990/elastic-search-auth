import { EncryptionService } from '../services/encryption.service';

export const ROLES = {
	ADMIN: true,
	USER: true
};

/**
 * TODO REVISE THESE
 */
export const INDEX = '12elasticsearchauth34users56index78';
export const TYPE = '1011user1213type1415fingers1617crossed1819';

export interface IUser {
	username: string;
	firstname: string;
	lastname: string;
	password?: any;
	role: string;
	email?: string;
}

export class User {
	public username: string;
	public firstname: string;
	public lastname: string;
	public password: any;
	public role: string;
	public email: string;

	public constructor(user: Object) {
		this.username = user['username'];
		this.firstname = user['firstname'];
		this.lastname = user['lastname'];
		this.password = EncryptionService.encrypt(user['password']);
		this.role = user['role'] in ROLES ? user['role'] : 'USER';
		this.email = user['email'];
	}

	public user(): IUser {
		return {
			username: this.username,
			firstname: this.firstname,
			lastname: this.lastname,
			password: this.password,
			role: this.role,
			email: this.email
		};
	}
}
