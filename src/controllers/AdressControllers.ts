import Address from "../models/Address";



export class AddressControllers {
    static async createAddress(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;

            const { landmark, lat, lon, house, title, address } = req.body;
            const newAddress = new Address({ landmark, lat, lon, house, title, address, user_id: userId });
            await newAddress.save();
            res.status(200).json({ message: 'Address created successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getAddress(req: any, res: any, next: any) {
        const userId = req.user.aud;
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;
        let nextPage: any = currentPage + 1;
        const prevPage = currentPage == 1 ? null : currentPage - 1;
        try {
            const totalAddresses = await Address.countDocuments({ user_id: userId });
            const totalPages = Math.ceil(totalAddresses / perPage);
            if (totalPages == 0 || currentPage == totalPages) {

                nextPage = null;
            }
            if (currentPage > totalPages) {
                return res.status(404).json({ message: 'Page not found', status: 404 });
            }

            const addresses = await Address.find({ user_id: userId }).skip((currentPage * perPage) - perPage).limit(perPage);
            res.status(200).json({ message: 'Addresses retrieved successfully', status: 200, data: addresses, pagination: { page: currentPage, perPage, totalPages, totalAddresses, nextPage, prevPage } });
        } catch (error) {
            next(error);
        }
    }


    static async updateAddress(req: any, res: any, next: any) {
        try {
            const { id } = req.params;
            const { landmark, lat, lon, house, title, address } = req.body;
            const updatedAddress = await Address.findByIdAndUpdate(id, { landmark, lat, lon, house, title, address, updated_at: new Date() }, { new: true });
            res.status(200).json({ message: 'Address updated successfully', status: 200, data: updatedAddress });
        } catch (error) {
            next(error);
        }
    }


    static async deleteAddress(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;
            const { id } = req.params;
            await Address.findByIdAndDelete(id, { user_id: userId });
            res.status(200).json({ message: 'Address deleted successfully', status: 200 });
        } catch (error) {
            next(error);
        }
    }

    static async getAddressById(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;
            const id = req.params.AddressId;

            const address = await Address.findOne({ _id: id, user_id: userId });

            if (!address) {
                return res.status(404).json({ message: 'Address not found', status: 404 });
            }
            res.status(200).json({
                message: 'Address retrieved successfully',
                status: 200,
                data: address
            });
        } catch (error) {
            next(error);
        }
    }



    static async checkAddress(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;
            const { lat, lon } = req.query;
            const address = await Address.findOne({ lat: parseFloat(lat), lon: parseFloat(lon), user_id: userId });
            if (!address) {
                return res.status(404).json({ message: 'Address not found', status: 404 });
            }
            res.status(200).json({
                message: 'Address retrieved successfully',
                status: 200,
                data: address
            });
        } catch (error) {
            next(error);
        }
    }


    static async getAddressLimit(req: any, res: any, next: any) {
        try {
            const userId = req.user.aud;

            const limit = parseInt(req.query.limit) || 10;
            const offset = parseInt(req.query.offset) || 0;
            const addresses = await Address.find({ user_id: userId }).skip(offset).limit(limit);
            res.status(200).json({
                message: 'Addresses retrieved successfully',
                status: 200,
                data: addresses
            });
        } catch (error) {
            next(error);
        }
    }

}