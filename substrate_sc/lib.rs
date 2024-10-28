#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod add_two_numbers {
    #[ink(storage)]
    pub struct SubstrateSC {}

    impl SubstrateSC {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {}
        }

        #[ink(message)]
        pub fn add(&self, a: u32, b: u32) -> u32 {
            a.wrapping_add(b)
        }
    }
}